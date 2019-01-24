process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://70d4d3ab5ca3447e893129ed31a2bfbc@sentry.cozycloud.cc/99'

const {
  BaseKonnector,
  requestFactory,
  saveBills,
  log,
  errors
} = require('cozy-konnector-libs')

const request = requestFactory({
  // debug: true,
  cheerio: true,
  json: false,
  jar: true,
  resolveWithFullResponse: true
})
module.exports = new BaseKonnector(start)

async function start(fields) {
  let _ = Math.floor(new Date().getTime() / 1000)

  await getLoginCookie()
  await authenticate(fields.login, fields.password)
  await getAuthenticationToken(fields.login, fields.password)
  await createAuthenticationCookie(_)
  let refBP = await getCustomerAccountData(_)
  await getBPCCCookie(refBP)
  await getBillCookies(_)
  await fetchBills(fields, _)
}

function getLoginCookie() {
  log('info', 'Get the login cookie to allowed further xhr calls...')

  return request({
    uri: 'https://particuliers.engie.fr/login-page.html'
  })
}

async function authenticate(login, password) {
  log('info', 'Authenticate to the main API...')

  try {
    return await request({
      uri: 'https://particuliers.engie.fr/cel-ws/espaceclient/connexion',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        composante: 'CEL',
        compteActif: 'true',
        login: login,
        motDePasse: password
      })
    })
  } catch (err) {
    if (err.statusCode === 401 || err.statusCode === 425) {
      // 425 is for GUT_ERR_TECH_CONNEXION_LOGIN_INEXISTANT in engie api
      log('error', err.message)
      throw new Error(errors.LOGIN_FAILED)
    } else if (err.statusCode !== 200) {
      log('error', err.message)
      throw new Error(errors.VENDOR_DOWN)
    }
  }
}

async function getAuthenticationToken(login, password) {
  log('info', 'Get the authentication token...')
  let retry = 10

  while (retry > 0) {
    try {
      const result = await request({
        uri:
          'https://particuliers.engie.fr/cel-ws/espaceclient/connexion/token',
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          composante: 'CEL',
          compteActif: 'true',
          login: login,
          motDePasse: password
        })
      })
      return result
    } catch (err) {
      if (
        err.statusCode === 401 &&
        retry > 1 &&
        err.error ===
          '{"code":null,"message":"The resource owner could not be authenticated due to missing or invalid credentials"}'
      ) {
        retry--
        log(
          'warn',
          `We got a 401 on getAuthenticationToken, retrying ${retry} times`
        )
        let sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
        await sleep(5000)
      } else {
        log('error', err.message)
        throw new Error(errors.VENDOR_DOWN)
      }
    }
  }
}

function createAuthenticationCookie(_) {
  log('info', 'Create the authentication cookie...')

  return request({
    url:
      'https://particuliers.engie.fr/bin/engie/servlets/securisation/creationCookie',
    qs: {
      param: _,
      _: _
    },
    method: 'GET'
  })
}

function getCustomerAccountData(_) {
  log('info', 'Get customer account data...')

  return request({
    uri:
      'https://particuliers.engie.fr/cel-ws/api/private/espaceclient/typeCompteClient',
    method: 'GET',
    qs: {
      _: _
    },
    headers: {
      'content-type': 'application/json'
    }
  }).then($ => {
    let json = JSON.parse($.body.text())

    return json.refBP
  })
}

function getBPCCCookie(refBP) {
  log('info', 'Get the BBPC cookie...')

  return request({
    uri: 'https://particuliers.engie.fr/cel-ws/api/private/cookie/cookiesBPCC',
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

function getBillCookies(_) {
  log('info', 'Get cookies to be allowed to get bills...')

  return request({
    uri: 'https://particuliers.engie.fr/cel-ws/api/private/compteenligne',
    qs: {
      _: _,
      prechargerFacture: true,
      prechargerPaiement: true,
      performSuiviEM: false,
      performLirePDL: true
    },
    method: 'GET'
  })
}

function fetchBills(fields, _) {
  log('info', 'Fetch bills...')

  return request({
    uri: 'https://particuliers.engie.fr/cel-ws/api/private/factures',
    qs: {
      dateDebutIntervalle: new Date('2000-01-01').toISOString(),
      dateFinIntervalle: new Date().toISOString(),
      _: _
    },
    headers: {
      'content-type': 'application/json'
    }
  }).then($ => {
    let data = JSON.parse($.body.text())
    let bills = []

    data.listeFactures.map(bill => {
      let date = new Date(bill.dateFacture)
      let pdfUrl =
        'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/' +
        encodeURIComponent(bill.url) +
        '/SAE/' +
        ('0' + (date.getDay() + 1)).slice(-2) +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        date.getFullYear() +
        encodeURIComponent('N°') +
        bill.numeroFacture +
        '.pdf'
      let billDate = new Date(bill.dateFacture)
      const isRefund = Boolean(bill.montantTTC.montant < 0)
      let amount = bill.montantTTC.montant
      if (isRefund) amount = Math.abs(amount)

      bills.push({
        subtype: bill.libelle,
        vendor: 'Engie',
        date: billDate,
        amount,
        isRefund,
        currency: 'EUR',
        fileurl: pdfUrl,
        filename:
          billDate.getFullYear() +
          ('0' + (billDate.getMonth() + 1)).slice(-2) +
          ('0' + (date.getDay() + 1)).slice(-2) +
          '_ENGIE_' +
          bill.libelle +
          '-' +
          bill.dateFacture +
          '.pdf',
        vendorRef: bill.numeroFacture
      })
    })

    saveBills(bills, fields, {
      identifiers: ['engie']
    })
  })
}
