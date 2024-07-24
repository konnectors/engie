import { ContentScript } from 'cozy-clisk/dist/contentscript'
import Minilog from '@cozy/minilog'
const log = Minilog('ContentScript')
Minilog.enable()

const baseUrl = 'https://particuliers.engie.fr/login-page/authentification.html'
const infoPersoUrl =
  'https://particuliers.engie.fr/espace-client/prive/mes-infos-personnelles.html'
const logoutLinkSelector = '[data-testid=deconnexion-trigger]'
const passwordSelector = 'input[type=password]'

class EngieContentScript extends ContentScript {
  async ensureAuthenticated({ account }) {
    this.log('info', '🤖 ensureAuthenticated')
    await this.ensureNotAuthenticated()
    await this.showLoginFormAndWaitForAuthentication()
    return true
  }
  async getUserDataFromWebsite() {
    this.log('info', '🤖 getUserDataFromWebsite')
    await this.goto(infoPersoUrl)
    await this.waitForElementInWorker('.k-simpleInfo__title span', {
      includesText: 'Email de connexion'
    })

    const sourceAccountIdentifier = await this.evaluateInWorker(
      function getSourceAccountIdentifier() {
        const span = this.selectElement('.k-simpleInfo__title span', {
          includesText: 'Email de connexion'
        })
        return span
          .closest('.k-simpleInfo__details')
          .querySelector('.k-simpleInfo__label span').innerHTML
      }
    )

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
    await this.goto(baseUrl)
  }

  async checkAuthenticated() {
    return Boolean(document.querySelector(logoutLinkSelector))
  }

  async showLoginFormAndWaitForAuthentication() {
    log.debug('showLoginFormAndWaitForAuthentication start')
    await this.clickAndWait(loginLinkSelector, '#username')
    await this.setWorkerState({ visible: true })
    await this.runInWorkerUntilTrue({
      method: 'waitForAuthenticated'
    })
    await this.setWorkerState({ visible: false })
  }

  async fetch(context) {
    this.log('info', '🤖 fetch')
    throw new Error('normal fetch error')
    await this.goto('https://books.toscrape.com')
    await this.waitForElementInWorker('#promotions')
    const bills = await this.runInWorker('parseBills')

    await this.saveBills(bills, {
      contentType: 'image/jpeg',
      fileIdAttributes: ['filename'],
      context
    })

    const identity = await this.runInWorker('parseIdentity')
    await this.saveIdentity(identity)
  }

  async parseBills() {
    const articles = document.querySelectorAll('article')
    return Array.from(articles).map(article => ({
      amount: normalizePrice(article.querySelector('.price_color')?.innerHTML),
      date: '2024-01-01', // use a fixed date to avoid the multiplication of bills
      vendor: 'template',
      filename: article.querySelector('h3 a')?.getAttribute('title'),
      fileurl:
        'https://books.toscrape.com/' +
        article.querySelector('img')?.getAttribute('src')
    }))
  }
}

const connector = new EngieContentScript()
connector.init({ additionalExposedMethodsNames: [] }).catch(err => {
  log.warn(err)
})
