const Promise = require('bluebird')
const req = require('request-promise')

const GET_ORDERS_URL = `https://api.mercadolibre.com/orders/search`

class MeliClient {
  constructor() {
    this.accounts = []
  }

  /**
   *
   * @param filters
   * @returns {Promise<void>}
   */
  async getOrders({accounts = [], id} = {}) {
    const filteredAccounts = accounts && accounts.length > 0 ?
      this.accounts.filter(acc => accounts.map(a => a.id).includes(acc.id)) :
      this.accounts

    const authenticatedAccounts = await this.authenticate(filteredAccounts)

    const reqOptionsBuilder = account => ({
      uri: GET_ORDERS_URL,
      qs: {
        seller: account.id,
        access_token: account.auth.accessToken,
        sort: 'date_desc',
        q: id
      },
      json: true
    })

    let orders = []
    try {
      orders = await Promise.map(authenticatedAccounts, async acc => ({
        account: acc,
        response: await req(reqOptionsBuilder(acc))
          .catch(e => {
            e.message = `Problem with meli orders request for ${acc.nickname}. ${e.message} `
            throw e
          })
      }))
    } catch (e) {
      console.error(e)
    }

    return orders
  }

  addAccount(account) {
    this.accounts.push(account)
  }

  async authenticate(accounts) {
    return Promise.filter(accounts, async acc => {
      try {
        await acc.checkAccessToken()
      } catch (e) {
        console.log(e)
        return false
      }
      return true
    })
  }
}

module.exports = MeliClient
