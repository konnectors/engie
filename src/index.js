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
  resolveWithFullResponse: true,
  headers: {
    Accept: '*/*'
  }
})
module.exports = new BaseKonnector(start)

async function start(fields) {
  await engieFetchLoginPage()
  await createAuthenticationCookie('engie')
  const status = await engieAuthenticate(fields.login, fields.password)

  if (status === 'engie') {
    // Continue process
    let refBP = await getCustomerAccountData(status)
    await getBPCCCookie(refBP, status)
    await getBillCookies(status)
    await fetchBills(fields, status)
  } else if (status === 'gazTarifReglemente') {
    // Try the GTR website
    await createAuthenticationCookie(status)
    await authenticateGazTarifReglemente(fields.login, fields.password)
    let refBP = await getCustomerAccountData(status)
    await getBPCCCookie(refBP, status)
    await getBillCookies(status)
    await fetchBills(fields, status)
  }
}

function engieFetchLoginPage() {
  log('info', 'Get initial cookies')
  return request({
    uri: 'https://particuliers.engie.fr/login-page.html'
  })
}

async function engieAuthenticate(login, password) {
  log('info', 'Authenticate to engie website...')
  try {
    await request({
      uri: 'https://particuliers.engie.fr/cel-ws/espaceclient/connexion/token',
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
        login: login,
        motDePasse: password,
        // Warning : this hard-coded token seems necessary
        // It appears recently, and seems to work for now like that for all acount
        // Login evolve a lot recently, could be subject to more change here
        secureToken: 'bDZFmRZHTF8KkBWr2jMyr5MCMzNAJmZTm2TNTuWmaQXHRN4E8N'
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
        'https://gaz-tarif-reglemente.fr/cel_tr_ws/espaceclient/connexion/token',
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

function createAuthenticationCookie(type) {
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

  return request({
    uri,
    qs: {
      param: _ + 3,
      _: _
    },
    method: 'GET'
  })
}

async function getCustomerAccountData(status) {
  log('info', 'Get customer account data...')
  let uri
  let headers
  if (status === 'engie') {
    uri =
      'https://particuliers.engie.fr/cel-ws/api/private/espaceclient/typeCompteClient/v2'
  } else if (status === 'gazTarifReglemente') {
    uri =
      'https://gaz-tarif-reglemente.fr/cel_tr_ws/api/private/espaceclient/typeCompteClient'
    // This weird header is present in request and mandatory.
    // If not we get a 'KO_TECHNIQUE' error
    headers = { estexo: true }
  } else {
    throw new Error('Should never happen, error during login')
  }

  return await request({
    uri,
    headers,
    method: 'GET'
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

function getBillCookies(status) {
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
      prechargerFacture: true,
      prechargerPaiement: true,
      performSuiviEM: false,
      performLirePDL: true
    },
    method: 'GET'
  })
}

async function fetchBills(fields, status) {
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
      dateFinIntervalle: new Date().toISOString()
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

    await saveBills(bills, fields, {
      identifiers: ['engie'],
      requestInstance: request // Seems to not work, use requestOptions too
    })
  })
}
