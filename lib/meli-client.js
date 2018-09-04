/* eslint-disable camelcase */
const Promise = require('bluebird')
const req = require('request-promise')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const MELI_BASE_URL = `https://api.mercadolibre.com`
const GET_ORDERS_URL = `${MELI_BASE_URL}/orders/search`
const GET_QUESTIONS_URL = `${MELI_BASE_URL}/my/received_questions/search`

class MeliClient {
  constructor() {
    this.accounts = []
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

  /**
   * Return questions of selected accounts.
   *
   * @param {Array<number>} accounts - selected account ids
   * @returns {Promise<Array>} questions result, grouped by account
   */
  async getQuestions({accounts} = {}) {
    await this._updateAccounts()
    const filterAccountsIds = accounts && accounts.map(a => a.id)
    const filteredAccounts = filterAccountsIds ?
      this.accounts.filter(acc => filterAccountsIds.includes(acc.id)) :
      this.accounts

    const authenticatedAccounts = await this.authenticate(filteredAccounts)

    const reqOptionsBuilder = account => ({
      uri: GET_QUESTIONS_URL,
      qs: {
        access_token: account.auth.accessToken,
        sort_fields: 'date_created',
        sort_types: 'DESC'
      },
      json: true
    })

    let questions = []
    try {
      questions = await Promise.map(authenticatedAccounts, async account => {
        const response = await req(reqOptionsBuilder(account))
          .catch(e => {
            e.message = `Problem with meli questions request for ${account.nickname}. ${e.message} `
            throw e
          })
        response.results = response.questions // Map meli response to match meliClient response structure
        return {account, response}
      })
    } catch (e) {
      console.error(e)
    }

    return questions
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
