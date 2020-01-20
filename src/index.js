process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://70d4d3ab5ca3447e893129ed31a2bfbc@sentry.cozycloud.cc/99'

const {
  CookieKonnector,
  log,
  errors,
  solveCaptcha
} = require('cozy-konnector-libs')

class EngieConnector extends CookieKonnector {
  async testSession() {
    try {
      const { status } = this.getAccountData()
      if (!status) return false

      log('info', 'Testing session')
      if (status === 'engie') {
        log('info', 'Found engie session')
        const jsonRequest = this.requestFactory({
          cheerio: false,
          json: true,
          headers: {
            Accept: '*/*'
          }
        })
        const response = await jsonRequest.post(
          'https://particuliers.engie.fr/cel-ws/espaceclient/connexion/token/keepmelogged',
          {
            body: {
              login: '',
              motDePasse: '',
              compteActif: true,
              composante: 'CEL'
            }
          }
        )
        log('info', 'Session is OK')
        log('info', JSON.stringify(response))
        return true
      } else if (status === 'gazTarifReglemente') {
        delete this._jar._jar.store.idx['gaz-tarif-reglemente.fr']['/'][
          'ClientIDCookie'
        ]
        await this.createAuthenticationCookie(status)
        await this.request({
          uri:
            'https://gaz-tarif-reglemente.fr/cel_tr_ws/espaceclient/connexion/token',
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            login: '',
            motDePasse: '',
            compteActif: true,
            composante: 'CELTR',
            captchaToken: ''
          })
        })
        const syntheseUrl =
          'https://gaz-tarif-reglemente.fr/espace-client-tr/synthese.html'
        const response = await this.request(syntheseUrl)
        const isOk = response.request.uri.href === syntheseUrl
        if (isOk) await this.saveSession()
        return isOk
      } else {
        log('error', `could not identify status: ${status}`)
        throw new Error('VENDOR_DOWN')
      }
    } catch (err) {
      log('warn', err.message)
      log('warn', 'Session failed')
      await this.resetSession()
      return false
    }
  }

  async fetch(fields) {
    if (!(await this.testSession())) {
      log('info', 'Found no correct session, logging in...')
      const $ = (await this.engieFetchLoginPage()).body
      await this.createAuthenticationCookie('engie')

      const status = await this.engieAuthenticate(
        fields.login,
        fields.password,
        $
      )

      // Try the GTR website
      if (status === 'gazTarifReglemente') {
        await this.createAuthenticationCookie(status)
        await this.authenticateGazTarifReglemente(fields.login, fields.password)
      }

      await this.saveAccountData({ status })
      this.saveSession()
      log('info', 'Successfully logged in')
    }

    const { status } = this.getAccountData()
    log('info', `status: ${status}`)
    let refBP = await this.getCustomerAccountData(status)
    await this.getBPCCCookie(refBP, status)
    await this.getBillCookies(status)
    await this.fetchBills(fields, status)
  }

  async engieFetchLoginPage() {
    log('info', 'Get initial cookies')
    return await this.request({
      uri: 'https://particuliers.engie.fr/login-page.html'
    })
  }

  async engieAuthenticate(login, password, $) {
    const websiteKey = $("#siteContent script[src*='api.js?render']")
      .attr('src')
      .split('=')
      .pop()
    if (!websiteKey) {
      log('error', 'Could not find the websitekey to solve the captcha')
      throw new Error('VENDOR_DOWN')
    }
    const websiteURL = 'https://particuliers.engie.fr/login-page.html'
    const pageAction = 'login'

    const secureToken = await solveCaptcha({
      type: 'recaptchav3',
      websiteKey,
      websiteURL,
      pageAction,
      minScore: 0.9
    })

    log('info', 'Authenticate to engie website...')
    try {
      await this.request({
        uri:
          'https://particuliers.engie.fr/cel-ws/espaceclient/connexion/token',
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        qs: {
          ooof: true
        },
        body: JSON.stringify({
          composante: 'CEL',
          compteActif: 'true',
          versionC: 'V3',
          login,
          motDePasse: password,
          secureToken
        })
      })
    } catch (err) {
      if (
        err.statusCode === 404 &&
        err.error === '{"code":"COMPTE_PAS_LIE_COMPOSANTE","message":null}'
      ) {
        log('info', 'Detecting gaz-tarif-reglemente.fr account')
        return 'gazTarifReglemente'
      } else if (err.statusCode === 401 || err.statusCode === 425) {
        // 425 is for GUT_ERR_TECH_CONNEXION_LOGIN_INEXISTANT in engie api
        log('error', err.message)
        throw new Error(errors.LOGIN_FAILED)
      } else if (err.statusCode !== 200) {
        log('error', err.message)
        throw new Error(errors.VENDOR_DOWN)
      }
    }
    // If login successfull
    return 'engie'
  }

  async authenticateGazTarifReglemente(login, password) {
    const websiteURL = 'https://gaz-tarif-reglemente.fr/login-page.html'
    const response = await this.request(websiteURL)
    log('info', 'Authenticate to the main API on gaz-tarif-reglemente.fr ...')
    try {
      const websiteKey = response
        .body("#siteContent script[src*='api.js?onload=onloadCallback&render']")
        .attr('src')
        .split('=')
        .pop()
      if (!websiteKey) {
        log('error', 'Could not find the websitekey to solve the captcha')
        throw new Error('VENDOR_DOWN')
      }
      const pageAction = 'loginTR'

      const captchaToken = await solveCaptcha({
        type: 'recaptchav3',
        websiteKey,
        websiteURL,
        pageAction,
        minScore: 0.3
      })

      await this.request({
        uri:
          'https://gaz-tarif-reglemente.fr/cel_tr_ws/espaceclient/connexion/token',
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          composante: 'CELTR',
          compteActif: true,
          login: login,
          motDePasse: password,
          captchaToken
        })
      })
    } catch (err) {
      // Bad password detected here, bad login detected at first auth (engie) for now
      if (err.statusCode === 425) {
        log('error', 'Login was at gaz-tarif-reglemente.fr')
        log('error', err.message)
        throw new Error(errors.LOGIN_FAILED)
      } else if (err.statusCode !== 200) {
        log('error', err.message)
        throw new Error(errors.VENDOR_DOWN)
      }
    }

    // If login successfull
    return 'gazTarifReglemente'
  }

  async createAuthenticationCookie(type) {
    log('info', 'Create the authentication cookie...')
    let uri
    const _ = Math.floor(new Date().getTime())
    if (type === 'engie') {
      uri =
        'https://particuliers.engie.fr/bin/engie/servlets/securisation/creationCookie'
    } else if (type === 'gazTarifReglemente') {
      uri =
        'https://gaz-tarif-reglemente.fr/bin/engietr/servlets/securisation/creationCookie'
    } else {
      throw new Error('Should never happen, error during login')
    }

    return await this.request({
      uri,
      qs: {
        param: _ + 3,
        _: _
      },
      method: 'GET'
    })
  }

  async getCustomerAccountData(status) {
    log('info', 'Get customer account data...')
    let uri
    let headers
    if (status === 'engie') {
      uri =
        'https://particuliers.engie.fr/cel-ws/api/private/espaceclient/typeCompteClient/v2'
    } else if (status === 'gazTarifReglemente') {
      uri =
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/espaceclient/typeCompteClient'
    } else {
      throw new Error('Should never happen, error during login')
    }

    return await this.request({
      uri,
      headers,
      method: 'GET'
    }).then($ => {
      let json = JSON.parse($.body.text())
      return json.refBP
    })
  }

  async getBPCCCookie(refBP, status) {
    log('info', 'Get the BBPC cookie...')
    let uri
    if (status === 'engie') {
      uri =
        'https://particuliers.engie.fr/cel-ws/api/private/cookie/cookiesBPCC'
    } else if (status === 'gazTarifReglemente') {
      uri =
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/cookie/cookiesBPCC'
    } else {
      throw new Error('Should never happen, error during login')
    }

    return await this.request({
      uri,
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        idApplicatif: refBP,
        refBP: refBP
      })
    })
  }

  async getBillCookies(status) {
    log('info', 'Get cookies to be allowed to get bills...')
    let uri
    if (status === 'engie') {
      uri = 'https://particuliers.engie.fr/cel-ws/api/private/compteenligne'
    } else if (status === 'gazTarifReglemente') {
      uri =
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/compteenligne'
    } else {
      throw new Error('Should never happen, error during login')
    }

    return await this.request({
      uri,
      qs: {
        prechargerFacture: true,
        prechargerPaiement: true,
        performSuiviEM: false,
        performLirePDL: true
      },
      method: 'GET'
    })
  }

  async fetchBills(fields, status) {
    log('info', 'Fetch bills...')
    let uri1, uri2
    if (status === 'engie') {
      uri1 = 'https://particuliers.engie.fr/cel-ws/api/private/factures'
      uri2 = 'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/'
    } else if (status === 'gazTarifReglemente') {
      uri1 = 'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/factures'
      uri2 =
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/document/mobile/'
    } else {
      throw new Error('Should never happen, error during login')
    }

    let $
    try {
      $ = await this.request({
        uri: uri1,
        qs: {
          dateDebutIntervalle: new Date('2000-01-01').toISOString(),
          dateFinIntervalle: new Date().toISOString()
        },
        headers: {
          'content-type': 'application/json'
        }
      })
    } catch (err) {
      if (
        err.statusCode === 400 &&
        err.error === '{"code":"MISSING_NUMCC","message":null}'
      ) {
        log(
          'warn',
          "No client account number, account has been suspended as it's " +
            'probably too old. Bills not accessible anymore.'
        )
        throw new Error(errors.USER_ACTION_NEEDED_ACCOUNT_REMOVED)
      }
      log('error', 'error while fetching bills')
      log('error', err.message)
      throw new Error(errors.VENDOR_DOWN)
    }

    let data = JSON.parse($.body.text())
    let bills = []

    data.listeFactures.map(bill => {
      const date = new Date(bill.dateFacture)
      const pdfUrl =
        uri2 +
        encodeURIComponent(bill.url) +
        '/SAE/' +
        ('0' + (date.getDate() + 1)).slice(-2) +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        date.getFullYear() +
        encodeURIComponent('N°') +
        bill.numeroFacture +
        '.pdf'
      const isRefund = Boolean(bill.montantTTC.montant < 0)
      let amount = bill.montantTTC.montant
      if (isRefund) amount = Math.abs(amount)
      const oldFilename =
        date.getFullYear() +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        ('0' + (date.getDay() + 1)).slice(-2) +
        '_ENGIE_' +
        bill.libelle +
        '-' +
        bill.dateFacture +
        '.pdf'
      const filename =
        date.getFullYear() +
        '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + (date.getDate() + 1)).slice(-2) +
        '_ENGIE_' +
        amount.toFixed(2) +
        '€_' +
        bill.libelle.replace(/ /g, '-') +
        '_' +
        bill.numeroFacture +
        '.pdf'

      bills.push({
        subtype: bill.libelle,
        vendor: 'Engie',
        date: date,
        amount,
        isRefund,
        currency: 'EUR',
        fileurl: pdfUrl,
        filename: filename,
        shouldReplaceName: oldFilename,
        vendorRef: bill.numeroFacture,
        requestOptions: {
          headers: {
            Accept: '*/*'
          }
        }
      })
    })

    await this.saveBills(bills, fields, {
      sourceAccount: this.accountId,
      sourceAccountIdentifier: fields.login,
      fileIdAttributes: ['vendorRef'],
      linkBankOperations: false
    })
  }
}

const connector = new EngieConnector({
  // debug: 'simple',
  cheerio: true,
  json: false,
  resolveWithFullResponse: true,
  headers: {
    Accept: '*/*'
  }
})

connector.run()
