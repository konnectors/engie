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
const logoutLinkSelector = '#header-deconnexion'
const passwordSelector = 'input[type=password]'
const loginSelector = 'input[type=email]'

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
  },
  {
    identifier: 'mes-coordonnees',
    method: 'GET',
    url: '/cel-gut-ws/api/private/mes-coordonnees',
    serialization: 'json'
  }
])
requestInterceptor.init()

class EngieContentScript extends ContentScript {
  async onWorkerReady() {
    await this.waitForElementNoReload.bind(this)(passwordSelector)
    const submitButton = document.querySelector(
      '.k-cta.k-cta--genBlue.k-cta--primary:not([id*=pushCta-])'
    )
    // Using classic event won't work properly, as all events only return "isTrusted" value
    // When submitting the form, the submit button mutate to disable himself and adds a spinner while waiting for the server response
    // Using this we ensure the user actually submit the loginForm
    if (MutationObserver) {
      const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'disabled'
          ) {
            if (submitButton.disabled) {
              this.log('debug', 'Submit detected, emitting credentials')
              this.emitCredentials.bind(this)()
            }
          }
        }
      })
      observer.observe(submitButton, { attributes: true })
    }
  }

  onWorkerEvent({ event, payload }) {
    this.log('info', 'onWorkerEvent starts')
    if (event === 'loginSubmit') {
      this.log('info', `User's credential intercepted`)
      const { login, password } = payload
      this.store.userCredentials = { login, password }
    }
  }

  emitCredentials() {
    this.log('info', '📍️ emitCredentials starts')
    const loginField = document.querySelector(loginSelector)
    const passwordField = document.querySelector(passwordSelector)
    if (loginField && passwordField) {
      this.log('info', 'Found credentials fields, adding submit listener')
      const login = loginField.value
      const password = passwordField.value
      const event = 'loginSubmit'
      const payload = { login, password }
      this.bridge.emit('workerEvent', {
        event,
        payload
      })
    } else {
      this.log('warn', 'Cannot find credentials fields, check the code')
    }
  }

  async ensureAuthenticated({ account }) {
    this.log('info', '🤖 ensureAuthenticated')
    this.bridge.addEventListener('workerEvent', this.onWorkerEvent.bind(this))
    if (!account) {
      await this.ensureNotAuthenticated()
    }
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

    await this.PromiseRaceWithError(
      [
        this.waitForElementInWorker(
          `${passwordSelector}, ${logoutLinkSelector}`
        ),
        this.waitForElementInWorker('button > span', {
          includesText: 'Se déconnecter'
        })
      ],
      'ensureNotAuthenticated: waiting for loaded authentication page'
    )

    if (
      !(await this.isElementInWorker('button > span', {
        includesText: 'Se déconnecter'
      }))
    ) {
      await this.runInWorker('click', 'button > span', {
        includesText: 'Se déconnecter'
      })
      await this.waitForElementInWorker(passwordSelector)
    }

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
    const credentials = await this.getCredentials()
    if (state === 'loginPage') {
      await this.runInWorker('autoFill', credentials)
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

    if (this.store.userCredentials) {
      await this.saveCredentials(this.store.userCredentials)
    }

    const contract = await this.fetchAttestations(context)
    await this.fetchFactures(context, contract)
    await this.fetchIdentity()
  }

  async fetchIdentity() {
    await this.goto(infoPersoUrl)
    const interception = await this.waitForRequestInterception(
      'mes-coordonnees'
    )

    const phone = []
    if (interception.response.fixe) {
      phone.push({
        type: 'home',
        number: interception.response.fixe
      })
    }
    if (interception.response.fixe) {
      phone.push({
        type: 'mobile',
        number: interception.response.portable
      })
    }

    const identity = {
      email: interception.response.email,
      name: {
        fullName: interception.response.titulaire
      },
      address: [
        {
          formattedAddress: interception.response.adresseComplete,
          street: `${interception.response.numeroVoie} ${interception.response.libelleVoie}`,
          postCode: interception.response.cp,
          city: interception.response.ville
        }
      ],
      phone
    }

    await this.saveIdentity(identity)
  }

  async fetchFactures(context, contract) {
    if (!contract) {
      return
    }
    await this.goto(facturesUrl)
    const interception = await this.waitForRequestInterception('factures')
    const derniereFacture = interception.response.derniereFacture

    if (derniereFacture) {
      const parsedDate = bruteParseDate(derniereFacture.dateDerniereFacture)
      const url = new URL(decodeURIComponent(derniereFacture.url))
      const urlParams = url.searchParams
      const vendorRef = urlParams.get('docId')

      const amount = parseFloat(derniereFacture.montantFacture.replace('€', ''))
      await this.saveBills(
        [
          {
            vendor: 'Engie',
            amount,
            date: parsedDate,
            filename: `${parsedDate.getYear() + 1900}-${String(
              parsedDate.getMonth() + 1
            ).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(
              2,
              '0'
            )}_Engie_${derniereFacture.montantFacture}.pdf`,
            fileIdAttributes: ['vendorRef'],
            vendorRef,
            fileurl:
              factureDownloadUrl +
              encodeURIComponent(derniereFacture.url) +
              '/SAE/facture.pdf',
            fileAttributes: {
              metadata: {
                contentAuthor: 'engie',
                issueDate: new Date(),
                datetime: parsedDate,
                datetimeLabel: 'startDate',
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
    }

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
        vendor: 'Engie',
        amount: parseFloat(fac.montant, 10),
        date: fac.parsedDate,
        filename: `${fac.parsedDate.getYear() + 1900}-${String(
          fac.parsedDate.getMonth() + 1
        ).padStart(2, '0')}-${String(fac.parsedDate.getDate()).padStart(
          2,
          '0'
        )}_Engie_${parseFloat(fac.montant, 10)}€.pdf`,
        vendorRef: fac.vendorRef,
        fileIdAttributes: ['vendorRef'],
        fileurl: fac.fileurl,
        fileAttributes: {
          metadata: {
            contentAuthor: 'engie',
            issueDate: new Date(),
            datetime: fac.parsedDate,
            invoiceNumber: `${fac.vendorRef}`,
            isSubscription: true,
            datetimeLabel: 'startDate',
            carbonCopy: true
          }
        }
      }))

    await this.saveBills(factures, {
      context,
      contract,
      fileIdAttributes: ['vendorRef'],
      contentType: 'application/pdf',
      qualificationLabel: 'energy_invoice'
    })
  }

  async fetchAttestations(context) {
    await this.goto(homeUrl)
    let idContrat
    try {
      idContrat = await this.waitForRequestInterception('idContrat')
    } catch (err) {
      this.log('warn', 'Found no contract, no attestation to fetch')
      return false
    }
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
          fileIdAttributes: ['vendorRef'],
          fileAttributes: {
            metadata: {
              contentAuthor: 'engie',
              carbonCopy: true,
              issueDate: new Date(),
              datetime: new Date(),
              datetimeLabel: 'startDate'
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
    const isConnected = await this.checkForElement(
      `a[data-testid=deconnexion-trigger]`
    )

    if (isAlreadyLogged) {
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

  async autoFill(credentials) {
    if (credentials) {
      const loginElement = document.querySelector(loginSelector)
      const passwordElement = document.querySelector(passwordSelector)
      loginElement.addEventListener('click', () => {
        loginElement.value = credentials.login
      })
      passwordElement.addEventListener('click', () => {
        passwordElement.value = credentials.password
      })
    }
  }

  async PromiseRaceWithError(promises, msg) {
    try {
      this.log('debug', msg)
      await Promise.race(promises)
    } catch (err) {
      if (err instanceof Error) {
        this.log('warn', err?.message || err)
      } else {
        this.log(
          'warn',
          `caught an Error which is not instance of Error: ${
            err?.message || JSON.stringify(err)
          }`
        )
      }
      throw new Error(`${msg} failed to meet conditions`)
    }
  }
}

const connector = new EngieContentScript({ requestInterceptor })
connector
  .init({
    additionalExposedMethodsNames: [
      'waitForNextState',
      'getCurrentState',
      'autoFill'
    ]
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
