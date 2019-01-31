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
  const status = await authenticate(fields.login, fields.password)

  if (status === 'engie') {
    await getAuthenticationToken(fields.login, fields.password)
  }
  await createAuthenticationCookie(_, status)
  if (status === 'gazTarifReglemente') {
    await authenticateGazTarifReglemente(fields.login, fields.password)
  }
  let refBP = await getCustomerAccountData(_, status)
  await getBPCCCookie(refBP, status)
  await getBillCookies(_, status)
  await fetchBills(fields, _, status)
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
    await request({
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

async function authenticateGazTarifReglemente(login, password) {
  log('info', 'Authenticate to the main API on gaz-tarif-reglemente.fr ...')
  try {
    await request({
      uri:
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/espaceclient/connexion?sgut1Counter',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        composante: 'CELTR',
        compteActif: 'true',
        login: login,
        motDePasse: password
      })
    })
  } catch (err) {
    // Bad password detected here, bad login detected at first auth (engie) for now
    if (err.statusCode === 401) {
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

function createAuthenticationCookie(_, status) {
  log('info', 'Create the authentication cookie...')
  let uri
  if (status === 'engie') {
    uri =
      'https://particuliers.engie.fr/bin/engie/servlets/securisation/creationCookie'
  } else if (status === 'gazTarifReglemente') {
    uri =
      'https://gaz-tarif-reglemente.fr/bin/engietr/servlets/securisation/creationCookie'
  } else {
    throw new Error('Should never happen, error during login')
  }

  return request({
    uri,
    qs: {
      param: _,
      _: _
    },
    method: 'GET'
  })
}

function getCustomerAccountData(_, status) {
  log('info', 'Get customer account data...')
  let uri
  if (status === 'engie') {
    uri =
      'https://particuliers.engie.fr/cel-ws/api/private/espaceclient/typeCompteClient'
  } else if (status === 'gazTarifReglemente') {
    uri =
      'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/espaceclient/typeCompteClient'
  } else {
    throw new Error('Should never happen, error during login')
  }

  return request({
    uri,
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

function getBPCCCookie(refBP, status) {
  log('info', 'Get the BBPC cookie...')
  let uri
  if (status === 'engie') {
    uri = 'https://particuliers.engie.fr/cel-ws/api/private/cookie/cookiesBPCC'
  } else if (status === 'gazTarifReglemente') {
    uri = 'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/session/set'
  } else {
    throw new Error('Should never happen, error during login')
  }

  return request({
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

function getBillCookies(_, status) {
  log('info', 'Get cookies to be allowed to get bills...')
  let uri
  if (status === 'engie') {
    uri = 'https://particuliers.engie.fr/cel-ws/api/private/compteenligne'
  } else if (status === 'gazTarifReglemente') {
    uri = 'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/compteenligne'
  } else {
    throw new Error('Should never happen, error during login')
  }

  return request({
    uri,
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

async function fetchBills(fields, _, status) {
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

  return request({
    uri: uri1,
    qs: {
      dateDebutIntervalle: new Date('2000-01-01').toISOString(),
      dateFinIntervalle: new Date().toISOString(),
      _: _
    },
    headers: {
      'content-type': 'application/json'
    }
  }).then(async $ => {
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
        bill.libelle.replace(' ', '-') +
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
        vendorRef: bill.numeroFacture
      })
    })

    await saveBills(bills, fields, {
      identifiers: ['engie']
    })
  })
}
