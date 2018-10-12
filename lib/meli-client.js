const Promise = require('bluebird')
const req = require('request-promise')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const GET_ORDERS_URL = 'https://api.mercadolibre.com/orders/search'

class MeliClient {
  constructor() {
    this.accounts = []
  }

  /**
   *
   * @param filters
   * @returns {Promise<void>}
   */
  async getOrders({accounts, id} = {}) {
    await this._updateAccounts()
    const filterAccountsIds = accounts && accounts.map(a => a.id)
    const filteredAccounts = filterAccountsIds ?
      this.accounts.filter(acc => filterAccountsIds.includes(acc.id)) :
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
    if (!account || !account.nickname) {
      throw new Error(`Can't add invalid account: ${account}`)
    }
    const isAlreadyIncluded = this.accounts.some(a => a.nickname === account.nickname)
    if (isAlreadyIncluded) {
      return
    }
    this.accounts.push(account)
  }

  async refreshAccountAuth(account) {
    if (account.isAuthorized()) {
      return
    }
    console.log(`Token for ${account.nickname} expired. Refreshing...`)
    try {
      await this.refreshAccessToken(account)
    } catch (e) {
      let originalMessage
      try {
        originalMessage = (e.data && JSON.parse(e.data).message) || e.message || ''
      } catch (e) {
        console.error(`Could not JSON.parse(e.data) on error of refreshAccessToken(): \n${JSON.stringify(e)}`)
      }
      e.message = `Could not refresh token for ${account.nickname}. Cause: ${originalMessage}`
      throw e
    }
    console.log(`Refresh token success for ${account.nickname}`)
  }

  async refreshAccessToken(account) {
    const accessToken = await refresh.requestNewAccessToken('mercadolibre', account.auth.refreshToken)
    await account.updateAccessToken(accessToken)
  }

  async authenticate(accounts) {
    return Promise.filter(accounts, async acc => {
      try {
        await this.refreshAccountAuth(acc)
      } catch (e) {
        // TODO update Account status error.
        console.log('Problem refreshing account authentication: ', e)
        return false
      }
      return true
    })
  }

  /**
   * Update local accounts by fetching DB stored accounts latest data.
   *
   * @private
   */
  async _updateAccounts() {
    const nicknames = this.accounts.map(acc => acc.nickname)
    const updatedAccounts = await Account.find({nickname: {$in: nicknames}})
    this.accounts = updatedAccounts
  }
}

module.exports = MeliClient
