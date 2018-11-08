const {
  BaseKonnector,
  requestFactory,
  saveBills,
  log
} = require('cozy-konnector-libs')

const request = requestFactory({
  debug: false,
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

function authenticate(login, password) {
  log('info', 'Authenticate to the main API...')

  return request({
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
}

function getAuthenticationToken(login, password) {
  log('info', 'Get the authentication token...')

  return request({
    uri: 'https://particuliers.engie.fr/cel-ws/espaceclient/connexion/token',
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
      let test = new Date(bill.dateFacture)
      let pdfUrl =
        'https://particuliers.engie.fr/cel-ws/api/private/document/mobile/' +
        encodeURIComponent(bill.url) +
        '/SAE/' +
        ('0' + (test.getDay() + 1)).slice(-2) +
        ('0' + (test.getMonth() + 1)).slice(-2) +
        test.getFullYear() +
        encodeURIComponent('N°') +
        bill.numeroFacture +
        '.pdf'
      let billDate = new Date(bill.dateFacture)

      bills.push({
        subtype: bill.libelle,
        type: 'bill',
        vendor: 'engie',
        date: billDate,
        amount: bill.montantTTC.montant,
        currency: 'EUR',
        fileurl: pdfUrl,
        filename:
          billDate.getFullYear() +
          ('0' + (billDate.getMonth() + 1)).slice(-2) +
          ('0' + (test.getDay() + 1)).slice(-2) +
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
