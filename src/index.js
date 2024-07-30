import {
  ContentScript,
  RequestInterceptor
} from 'cozy-clisk/dist/contentscript'
import { blobToBase64 } from 'cozy-clisk/dist/contentscript/utils'
import Minilog from '@cozy/minilog'
import ky from 'ky/umd'

const log = Minilog('ContentScript')
Minilog.enable()

const baseUrl = 'https://particuliers.engie.fr'
const loginUrl =
  'https://particuliers.engie.fr/login-page/authentification.html'
const homeUrl = 'https://particuliers.engie.fr/espace-client/prive/accueil.html'
const infoPersoUrl =
  'https://particuliers.engie.fr/espace-client/prive/mes-infos-personnelles.html'
const facturesUrl =
  'https://particuliers.engie.fr/espace-client/prive/mes-factures.html'
const factureDownloadUrl =
  'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/'
const logoutLinkSelector = '[data-testid=deconnexion-trigger]'
const passwordSelector = 'input[type=password]'

const requestInterceptor = new RequestInterceptor([
  {
    identifier: 'idContrat',
    method: 'GET',
    url: '/cel-facturation-ws/api/private/contrat/idContrat',
    serialization: 'text'
  },
  {
    identifier: 'identifiant',
    method: 'GET',
    url: 'auth-ws/api/private/identifiant',
    serialization: 'json'
  },
  {
    identifier: 'personne',
    method: 'GET',
    url: '/cel-ws/api/private/personne',
    serialization: 'json'
  },
  {
    identifier: 'factures',
    method: 'GET',
    url: '/cel-facturation-ws/api/private/situation-comptable/facture',
    serialization: 'json'
  }
])
requestInterceptor.init()

class EngieContentScript extends ContentScript {
  async ensureAuthenticated({ account }) {
    this.log('info', '🤖 ensureAuthenticated')
    // await this.ensureNotAuthenticated()
    await this.showLoginFormAndWaitForAuthentication()
    return true
  }
  async getUserDataFromWebsite() {
    this.log('info', '🤖 getUserDataFromWebsite')
    await this.goto(infoPersoUrl)
    const identifiant = await this.waitForRequestInterception('identifiant')

    const sourceAccountIdentifier = identifiant.response.data.identifiant

    return {
      sourceAccountIdentifier
    }
  }
  async ensureNotAuthenticated() {
    this.log('info', '🤖 ensureNotAuthenticated')
    await this.navigateToLoginForm()
    await this.waitForElementInWorker(
      `${passwordSelector}, ${logoutLinkSelector}`
    )
    const authenticated = await this.runInWorker('checkAuthenticated')
    if (!authenticated) {
      return true
    }

    await this.clickAndWait(logoutLinkSelector, passwordSelector)
    return true
  }
  async navigateToLoginForm() {
    this.log('info', '🤖 navigateToLoginForm')
    await this.goto(loginUrl)
  }

  async checkAuthenticated() {
    return Boolean(document.querySelector(logoutLinkSelector))
  }

  async showLoginFormAndWaitForAuthentication() {
    log.debug('showLoginFormAndWaitForAuthentication start')
    await this.navigateToLoginForm()
    // await this.clickAndWait(loginLinkSelector, '#username')
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({
      method: 'waitForAuthenticated'
    })
    await this.setWorkerState({ visible: false })
  }

  /**
   * Allow other http method than get
   */
  async downloadFileInWorker(entry) {
    if (entry.method === 'post') {
      const searchParams = new URLSearchParams()
      for (const [key, value] of entry.searchParams) {
        searchParams.set(key, value)
      }
      entry.blob = await ky.post(entry.fileurl, { body: searchParams }).blob()
      entry.dataUri = await blobToBase64(entry.blob)

      return entry.dataUri
    } else {
      entry.blob = await ky.get(entry.fileurl).blob()
      entry.dataUri = await blobToBase64(entry.blob)

      return entry.dataUri
    }
  }

  async fetch(context) {
    this.log('info', '🤖 fetch')

    await this.fetchAttestations(context)
    await this.fetchFactures(context)
  }

  async fetchFactures(context) {
    await this.goto(facturesUrl)
    const interception = await this.waitForRequestInterception('factures')
    const derniereFacture = interception.response.derniereFacture

    const parsedDate = bruteParseDate(derniereFacture.dateDerniereFacture)
    const url = new URL(decodeURIComponent(derniereFacture.url))
    const urlParams = url.searchParams
    const vendorRef = urlParams.get('docId')

    await this.saveFiles(
      [
        {
          filename: `${parsedDate.getYear() + 1900}-${String(
            parsedDate.getMonth() + 1
          ).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(
            2,
            '0'
          )}_Engie_${derniereFacture.montantFacture}.pdf`,
          vendorRef,
          fileurl:
            factureDownloadUrl +
            encodeURIComponent(derniereFacture.url) +
            '/SAE/facture.pdf',
          fileAttributes: {
            metadata: {
              contentAuthor: 'engie',
              carbonCopy: true
            }
          }
        }
      ],
      {
        context,
        fileIdAttributes: ['vendorRef'],
        contentType: 'application/pdf',
        qualificationLabel: 'energy_invoice'
      }
    )

    const factures = Object.values(
      interception.response.historiqueFacture.factures
    )
      .reduce((memo, value) => [...memo, ...value], [])
      .map(fac => ({
        ...fac,
        parsedDate: bruteParseDate(fac.date),
        fileurl:
          factureDownloadUrl +
          encodeURIComponent(fac.url) +
          '/SAE/Facture%20de%20consommation',
        vendorRef: new URL(decodeURIComponent(fac.url)).searchParams.get(
          'docId'
        )
      }))
      .map(fac => ({
        filename: `${fac.parsedDate.getYear() + 1900}-${String(
          fac.parsedDate.getMonth() + 1
        ).padStart(2, '0')}-${String(fac.parsedDate.getDate()).padStart(
          2,
          '0'
        )}_Engie_${parseInt(fac.montant, 10)}.pdf`,
        vendorRef: fac.vendorRef,
        fileurl: fac.fileurl,
        fileAttributes: {
          metadata: {
            contentAuthor: 'engie',
            carbonCopy: true
          }
        }
      }))

    await this.saveFiles(factures, {
      context,
      fileIdAttributes: ['vendorRef'],
      contentType: 'application/pdf',
      qualificationLabel: 'energy_invoice'
    })
  }

  async fetchAttestations(context) {
    await this.goto(homeUrl)

    const idContrat = await this.waitForRequestInterception('idContrat')
    const vendorRef = idContrat.response

    await this.saveFiles(
      [
        {
          forceReplaceFile: true,
          filename: `justificatif de domicile.pdf`,
          vendorRef,
          fileurl:
            baseUrl + '/cel-ws/api/private/pdf/attestationTitulaireContrat',
          method: 'post',
          searchParams: [
            ['idContrat', vendorRef],
            ['is2DDoc', true]
          ],
          fileAttributes: {
            metadata: {
              contentAuthor: 'engie',
              carbonCopy: true
            }
          }
        }
      ],
      {
        context,
        fileIdAttributes: ['vendorRef'],
        contentType: 'application/pdf',
        qualificationLabel: 'energy_invoice'
      }
    )
  }
}

const connector = new EngieContentScript({ requestInterceptor })
connector.init({ additionalExposedMethodsNames: [] }).catch(err => {
  log.warn(err)
})

function bruteParseDate(dateString) {
  let [day, month, year] = dateString.split(' ')

  day = parseInt(day, 10)

  switch (month) {
    case 'Jan.':
    case 'Janvier':
      month = '01'
      break
    case 'Fév.':
    case 'Fev.':
    case 'Févr.':
    case 'Fevr.':
    case 'Fevrier':
    case 'Février':
      month = '02'
      break
    case 'Mar.':
    case 'Mars':
      month = '03'
      break
    case 'Avr.':
    case 'Avri.':
    case 'Avril':
      month = '04'
      break
    case 'Mai':
      month = '05'
      break
    case 'Juin':
    case 'Jui.':
      month = '06'
      break
    case 'Juil.':
    case 'Juillet':
      month = '07'
      break
    case 'Août':
    case 'Aout':
    case 'Aoû.':
    case 'Aou.':
      month = '08'
      break
    case 'Sept.':
    case 'Septembre':
      month = '09'
      break
    case 'Oct.':
    case 'Octobre':
      month = '10'
      break
    case 'Nov.':
    case 'Novembre':
      month = '11'
      break
    case 'Déc.':
    case 'Dec.':
    case 'Déce.':
    case 'Dece.':
    case 'Décembre':
    case 'Decembre':
      month = '12'
      break
  }

  year = parseInt(year, 10)
  return new Date(`${month}/${day}/${year}`)
}
