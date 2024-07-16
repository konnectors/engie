const { CookieKonnector, log, errors } = require('cozy-konnector-libs')

class EngieConnector extends CookieKonnector {
  async fetch(fields) {
    // Mainly use this json mode for request but not all
    this.requestJSON = this.requestFactory({
      cheerio: false,
      json: true,
      debug: true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
      }
    })

    await this.deactivateAutoSuccessfulLogin()
    await this.login.bind(this)(fields)
    await this.notifySuccessfulLogin()

    const personne = await this.requestJSON({
      uri: 'https://particuliers.engie.fr/cel-ws/api/private/personne'
    })

    const facture = await this.requestJSON({
      uri: 'https://particuliers.engie.fr/cel-facturation-ws/api/private/situation-comptable/facture'
    })

    const entries = []
    const oldFactures = facture.historiqueFacture.factures || {}
    for (const year in oldFactures) {
      console.log(year)
      for (const bill of oldFactures[year]) {
        entries.push({
          filename: 'Engie ' + bill.date + '_' + bill.montant + '.pdf',
          fileurl:
            'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/' +
            encodeURI(bill.url) +
            '/SAE/facture.pdf'
        })
      }
    }
    console.log(entries)
    // Last bill is separate from archive
    entries.push({
      filename:
        'DERNIERE_Engie ' +
        facture.derniereFacture.dateDerniereFacture +
        '_' +
        facture.derniereFacture.montantFacture +
        '.pdf',
      fileurl:
        'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/' +
        encodeURI(facture.derniereFacture.url) +
        '/SAE/facture.pdf',
      requestOptions: {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
        }
      }
    })

    console.log(entries)
    await this.saveFiles(entries, fields)

    await this.saveSession()
  }

  async login(fields) {
    await this.initSession()

    log('debug', 'Fetching form and cookies')
    await this.request(
      'https://particuliers.engie.fr/login-page/authentification.html'
    )
    await this.requestJSON({
      uri: 'https://particuliers.engie.fr/digital-common-ws/api-management/creation-cookie',
      method: 'POST',
      headers: {
        demandeur: 'PARTICULIERS_WEB'
      }
    })

    log('debug', 'Sending login POST')
    let loginReq
    try {
      loginReq = await this.requestJSON({
        method: 'POST',
        uri: 'https://identite-prd.engie.fr/api/v1/authn',
        body: {
          username: fields.login,
          password: fields.password,
          options: { multiOptionalFactorEnroll: true }
        }
      })
    } catch (e) {
      if (e.message.includes('Authentication failed')) {
        throw new Error(errors.LOGIN_FAILED)
      } else {
        throw e
      }
    }

    let sessionToken
    if (loginReq.status === 'SUCCESS') {
      log('info', 'Login to identite server ok without 2FA, login to api')
      sessionToken = loginReq.sessionToken
    } else if (loginReq.status === 'MFA_REQUIRED') {
      log('info', '2FA auth needed')
      if (loginReq?._embedded?.factors.length > 0) {
        const email2faIndex = loginReq._embedded.factors.findIndex(
          obj => obj.factorType == 'email'
        )
        if (email2faIndex) {
          const stateToken = loginReq.stateToken
          const challengeLink =
            loginReq._embedded.factors[email2faIndex]._links.verify.href
          // Getting the email send
          await this.requestJSON({
            method: 'POST',
            uri: challengeLink,
            body: { stateToken }
          })
          const code = await this.waitForTwoFaCode({
            type: 'email'
          })
          log('debug', 'Sending 2FA code to Engie')
          const challengeCompletReq = await this.requestJSON({
            method: 'POST',
            uri: challengeLink,
            body: {
              passCode: code,
              stateToken
            }
          })
          if (challengeCompletReq.status === 'SUCCESS') {
            log('info', 'Login to identite server ok, login to api')
            sessionToken = challengeCompletReq.sessionToken
          } else {
            log('error', 'Login not successful after sending 2FA code')
            throw new Error(errors.VENDOR_DOWN)
          }
        } else {
          log('error', 'No 2FA email available')
          throw new Error(errors.VENDOR_DOWN)
        }
      } else {
        log('error', 'No 2FA factor found. Not normal')
        throw new Error(errors.VENDOR_DOWN)
      }
    } else {
      log('error', 'Login status unknown')
      throw new Error(errors.VENDOR_DOWN)
    }

    // 2nd step
    // Oauth with api.dgp.engie.fr
    // Using session token

    // Generating random start of state (10 char) using charset as seen in website
    const possible = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let state = ''
    for (let i = 0; i < 10; i++) {
      state += possible.charAt(Math.floor(Math.random() * possible.length))
    }

    // Warning, redirect_uri should not be url encoded here, do not use qs constructor of request
    const oauthUrl =
      `https://api.dgp.engie.fr/oauth/v1/authorize` +
      `?client_id=gAeNcRIOkLBQxK0HeZu8JDIPgVn9Pb8n` +
      `&redirect_uri=https://particuliers.engie.fr/auth-ws/auth-callback&response_type=code` +
      `&sessionToken=${sessionToken}` +
      `&state=${state}%7Cparcours%3DMFA_CHALLENGE%7Ckml%3Dtrue&scope=openid profile idb2c apihour:read apihour:write offline_access`
    const oauthReq = await this.request({
      uri: oauthUrl
    })

    if (oauthReq.body.text().includes('"statut":"OK"')) {
      log('info', 'Oauth login step succeed')
    } else {
      log('error', 'Login not successful after Oauth (2nd step)')
      throw new Error('VENDOR_DOWN')
    }

    // 3rd step
    // Updating mandatory cookies

    // Fetching mandatory refBP and contract number for this user
    const composantes = await this.requestJSON({
      uri: 'https://particuliers.engie.fr/cel-ws/api/private/espaceclient/composantes/v4'
    })
    const refBP =
      composantes.listeIdentifiantsApplicatif[0].identifiantApplicatif
    const refBPRequest = await this.requestJSON({
      uri: 'https://particuliers.engie.fr/cel-ws/api/private/compteenligne/bp',
      qs: { refBP }
    })
    const contractNumber = refBPRequest.ccEnSession

    // Updating cookie BPCC
    await this.requestJSON({
      uri: 'https://particuliers.engie.fr/cel-ws/api/private/cookie/cookiesBPCC',
      method: 'POST',
      body: {
        refBP,
        idApplicatif: refBP,
        compteContrat: contractNumber
      },
      headers: {
        demandeur: 'AUTH_FRONT'
      }
    })

    // Updating main cookie
    await this.requestJSON({
      uri: 'https://particuliers.engie.fr/digital-common-ws/api-management/creation-cookie',
      method: 'POST', // empty POST mandatory
      headers: {
        demandeur: 'PARTICULIERS_WEB'
      }
    })

    // We save the session here a first time.
    await this.saveSession()
  }

  // Mandatory method for cookieKonnector, do nothing
  async testSession() {
    return false
  }
}

const connector = new EngieConnector({
  // debug: 'simple',
  cheerio: true,
  json: false,
  resolveWithFullResponse: true,
  headers: {
    Accept: '*/*',
    'User-Agent':
      'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0'
  }
})

connector.run()
