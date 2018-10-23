const {
  BaseKonnector,
  requestFactory,
  saveBills,
  log
} = require('cozy-konnector-libs')

const request = requestFactory({
  // the debug mode shows all the details about http request and responses. Very useful for
  // debugging but very verbose. That is why it is commented out by default
  debug: false,
  // activates [cheerio](https://cheerio.js.org/) parsing on each page
  cheerio: true,
  // If cheerio is activated do not forget to deactivate json parsing (which is activated by
  // default in cozy-konnector-libs
  json: false,
  // this allows request-promise to keep cookies between requests
  jar: true,
  resolveWithFullResponse: true
})
let jarjar = []
let refBP = ''
let _ = Math.floor(new Date().getTime() / 1000)

module.exports = new BaseKonnector(start)

async function start(fields) {
  await getLoginCookie()
  await authenticate(fields.login, fields.password)
  await getAuthenticationToken(fields.login, fields.password)
  await createAuthenticationCookie()
  await getCustomerAccountData()
  await getBPCCCookie()
  await getBillCookies()
  await fetchBills(fields)
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
      'content-type': 'application/json',
      'set-cookie': jarjar
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

function createAuthenticationCookie() {
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

function getCustomerAccountData() {
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
    refBP = json.refBP
    jarjar.push('Cel_BP=' + refBP + '; ')

    jarjar = jarjar.concat($.headers['set-cookie'])
  })
}

function getBPCCCookie() {
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

function getBillCookies() {
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

function fetchBills(fields) {
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

      bills.push({
        isRefund: false,
        subtype: bill.libelle,
        type: 'bill',
        vendor: 'engie',
        date: new Date(bill.dateFacture * 1000),
        amount: bill.montantTTC.montant,
        currency: 'EUR',
        fileurl: pdfUrl,
        filename: bill.libelle + '-' + bill.dateFacture + '.pdf',
        vendorRef: bill.numeroFacture
      })
    })

    saveBills(bills, fields, {
      identifiers: ['vendor']
    })
  })
}
