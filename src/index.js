import {
  ContentScript,
  RequestInterceptor
} from 'cozy-clisk/dist/contentscript'
import { blobToBase64 } from 'cozy-clisk/dist/contentscript/utils'
import Minilog from '@cozy/minilog'
import ky from 'ky/umd'
import waitFor, { TimeoutError } from 'p-wait-for'

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
  async ensureAuthenticated() {
    this.log('info', '🤖 ensureAuthenticated')
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
    const start = Date.now()
    let state = await this.runInWorkerUntilTrue({
      method: 'waitForNextState',
      args: [false],
      timeout: 20 * 1000
    })
    while (state !== 'connected' && state !== 'loginPage') {
      this.log('debug', `current state: ${state}`)
      if (Date.now() - start > 300 * 1000) {
        throw new Error(
          'showLoginFormAndWaitForAuthentication took more than 5m'
        )
      }
      await this.triggerNextLoginState(state)
      state = await this.runInWorkerUntilTrue({
        method: 'waitForNextState',
        args: [state],
        timeout: 20 * 1000
      })
    }

    if (state === 'loginPage') {
      await this.setWorkerState({ visible: true })
      await this.runInWorkerUntilTrue({
        method: 'waitForAuthenticated'
      })
      await this.setWorkerState({ visible: false })
    }
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

    const contract = await this.fetchAttestations(context)
    await this.fetchFactures(context, contract)
  }

  async fetchFactures(context, contract) {
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
        contract,
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
        )}_Engie_${parseFloat(fac.montant, 10)}€.pdf`,
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
      contract,
      fileIdAttributes: ['vendorRef'],
      contentType: 'application/pdf',
      qualificationLabel: 'energy_invoice'
    })
  }

  async fetchAttestations(context) {
    await this.goto(homeUrl)

    const idContrat = await this.waitForRequestInterception('idContrat')
    const vendorRef = idContrat.response

    const contract = {
      id: vendorRef,
      name: vendorRef
    }

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
        contract,
        fileIdAttributes: ['vendorRef'],
        contentType: 'application/pdf',
        qualificationLabel: 'energy_invoice'
      }
    )
    return contract
  }

  async getCurrentState() {
    const isLoginPage = await this.checkForElement(passwordSelector)
    const isAlreadyLogged = await this.checkForElement(
      `img[src*='illu-inbox-success.svg']`
    )
    const isBrowserNotYoung = await this.checkForElement(`p`, {
      includesText: 'Votre navigateur n’est plus tout jeune'
    })
    const isOldBrowser = window.location.href.includes(
      'page-navigateur-obsolete.html'
    )
    const isConnected = await this.checkForElement(
      `a[data-testid=deconnexion-trigger]`
    )

    if (isBrowserNotYoung) {
      return 'browserNotYoung'
    } else if (isOldBrowser) {
      return 'oldBrowser'
    } else if (isAlreadyLogged) {
      return 'alreadyLogged'
    } else if (isConnected) {
      return 'connected'
    } else if (isLoginPage) {
      return 'loginPage'
    } else return false
  }

  async triggerNextLoginState(currentState) {
    this.log('info', '📍️ triggerNextLoginState starts')
    if (currentState === 'alreadyLogged') {
      await this.runInWorker('click', 'button', {
        includesText: `Accéder à l'Espace Client`
      })
    } else if (currentState === 'browserNotYoung') {
      await this.runInWorker('click', 'button', {
        includesText: `Mettre à jour`
      })
    } else if (currentState === 'oldBrowser') {
      await this.runInWorker(
        'click',
        `a[href='https://particuliers.engie.fr/']`
      )
    } else if (currentState === 'loginPage') {
      // the user will do the login
    } else {
      throw new Error(`Unknown page state: ${currentState}`)
    }
  }

  async waitForNextState(previousState) {
    let currentState
    await waitFor(
      async () => {
        currentState = await this.getCurrentState()
        this.log('info', 'waitForNextState: currentState ' + currentState)
        if (currentState === false) return false
        const result = previousState !== currentState
        return result
      },
      {
        interval: 1000,
        timeout: {
          milliseconds: 30 * 1000,
          message: new TimeoutError(
            `waitForNextState timed out after ${
              30 * 1000
            }ms waiting for a state different from ${previousState}`
          )
        }
      }
    )
    return currentState
  }
}

const connector = new EngieContentScript({ requestInterceptor })
connector
  .init({
    additionalExposedMethodsNames: ['waitForNextState', 'getCurrentState']
  })
  .catch(err => {
    log.warn(err)
  })

function bruteParseDate(dateString) {
  let [day, month, year] = dateString.split(' ')

  day = parseInt(day, 10)

  switch (month) {
    case 'Jan.':
    case 'janvier':
      month = '01'
      break
    case 'Fév.':
    case 'Fev.':
    case 'Févr.':
    case 'Fevr.':
    case 'fevrier':
    case 'février':
      month = '02'
      break
    case 'Mar.':
    case 'mars':
      month = '03'
      break
    case 'Avr.':
    case 'Avri.':
    case 'avril':
      month = '04'
      break
    case 'mai':
    case 'Mai':
      month = '05'
      break
    case 'Juin':
    case 'juin':
    case 'Jui.':
      month = '06'
      break
    case 'Juil.':
    case 'juillet':
      month = '07'
      break
    case 'août':
    case 'aout':
    case 'Aoû.':
    case 'Aou.':
      month = '08'
      break
    case 'Sept.':
    case 'septembre':
      month = '09'
      break
    case 'Oct.':
    case 'octobre':
      month = '10'
      break
    case 'Nov.':
    case 'novembre':
      month = '11'
      break
    case 'Déc.':
    case 'Dec.':
    case 'Déce.':
    case 'Dece.':
    case 'décembre':
    case 'decembre':
      month = '12'
      break
  }

  year = parseInt(year, 10)
  return new Date(`${month}/${day}/${year}`)
}
