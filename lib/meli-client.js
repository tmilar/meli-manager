/* eslint-disable camelcase */
const Promise = require('bluebird')
const req = require('request-promise')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const MELI_BASE_URL = 'https://api.mercadolibre.com'
const GET_ORDERS_URL = `${MELI_BASE_URL}/orders/search`
const GET_QUESTIONS_URL = `${MELI_BASE_URL}/my/received_questions/search`
const GET_QUESTION_URL = `${MELI_BASE_URL}/questions` // + `/${id}`
const GET_ITEM_IDS_URL = (userId) => `${MELI_BASE_URL}/users/${userId}/items/search`
const GET_ITEM_BY_ID = (itemId) => `${MELI_BASE_URL}/items/${itemId}`
const POST_ITEM_URL = `${MELI_BASE_URL}/items`
const POST_QUESTION_URL = (itemId) => `${MELI_BASE_URL}/questions/${itemId}`

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
   * @param {Array<Account>} [accounts] - selected accounts
   * @param {number}         [id]       - get only specified order id
   * @returns {Promise<Array>} orders response, grouped by account
   */
  async getOrders({accounts, id} = {}) {
    const authenticatedAccounts = await this.filterAccounts(accounts)

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
          .catch(error => {
            error.message = `Problem with meli orders request for ${acc.nickname}. ${error.message} `
            throw error
          })
      }))
    } catch (error) {
      console.error(error)
    }

    return orders
  }

  /**
   * Filter this.accounts by specified accounts.
   * Refresh authorizations if expired.
   *
   * @param {Array<Account>} [accounts] - selected accounts. optional, if empty: use all client stored accounts.
   * @returns {Promise<Account>} authenticatedAccounts
   */
  async filterAccounts(accounts) {
    await this._updateAccounts()
    const validAccountsParam = accounts && Array.isArray(accounts) && accounts.every(a => a && a.id)
    const filterAccountsIds = validAccountsParam && accounts.map(a => a.id)
    const filteredAccounts = filterAccountsIds ?
      this.accounts.filter(acc => filterAccountsIds.includes(acc.id)) :
      this.accounts

    const authenticatedAccounts = await this.authenticate(filteredAccounts)
    if (!authenticatedAccounts || authenticatedAccounts.length === 0) {
      throw new Error('No authenticated accounts configured in meli client!')
    }
    return authenticatedAccounts
  }

  /**
   * Return questions of selected accounts.
   *
   * @param {Array<Account>} [accounts] - optional accounts select filter
   * @param {string} [status] - filter by question status: one of ['ANSWERED', 'BANNED', 'CLOSED_UNANSWERED', 'DELETED', 'DISABLED', 'UNANSWERED', 'UNDER_REVIEW']
   *
   * @returns {Promise<Array>} questions result, grouped by account
   */
  async getQuestions({accounts, status} = {}) {
    const authenticatedAccounts = await this.filterAccounts(accounts)

    const reqOptionsBuilder = account => ({
      uri: GET_QUESTIONS_URL,
      qs: {
        access_token: account.auth.accessToken,
        sort_fields: 'date_created',
        sort_types: 'DESC',
        status
      },
      json: true
    })

    const mapQuestionsResponse = ({account, response}) => {
      response.results = response.questions // Map meli response to match meliClient response structure
      return {account, response}
    }

    let questions = []
    try {
      questions = await Promise.map(authenticatedAccounts, async account => {
        const response = await req(reqOptionsBuilder(account))
          .catch(error => {
            error.message = `Problem with meli questions request for ${account.nickname}. ${error.message} `
            throw error
          })
        return {account, response}
      }).map(mapQuestionsResponse)
    } catch (error) {
      console.error(error)
    }

    return questions
  }

  /**
   * Retrieve one question by id.
   * If seller account is not specified, it will be looked up in all registered client accounts. If not found, it'll be empty.
   *
   * @param {number} id - question id to retrieve
   *
   * @returns {Promise<Array>} the [{account, question}] object, with the seller account and the question (or the error if not found).
   */
  async getQuestion(id) {
    if (!id) {
      throw new Error('Must specify param question id to be retrieved.')
    }
    const authenticatedAccounts = await this.filterAccounts()
    const singleAccountArray = [authenticatedAccounts[0]]

    const reqOptionsBuilder = account => ({
      uri: `${GET_QUESTION_URL}/${id}`,
      qs: {
        access_token: account.auth.accessToken
      },
      json: true
    })

    const mapQuestionResponse = ({response}) => {
      const emptyAccount = {}
      if (!response || (response.status && response.error) || !response.seller_id) {
        // No question, return an empty account object + error info
        return {account: emptyAccount, response}
      }

      const sellerAccount = authenticatedAccounts.find(acc => acc.id === response.seller_id) || emptyAccount
      return {account: sellerAccount, response}
    }

    let questionResponse = []
    try {
      questionResponse = await Promise.map(singleAccountArray, async account => {
        try {
          const response = await req(reqOptionsBuilder(account))
          return {response}
        } catch (error) {
          error.message = `Problem with meli question request for ${account.nickname}. ${error.message} `
          return {response: error.error}
        }
      }).map(mapQuestionResponse)
    } catch (error) {
      console.error(error)
    }

    return questionResponse
  }

  async postQuestionAnswer(id, answer) {
    const body = {text: answer}
    console.log(`false POST question id: ${id} the answer: '${answer}'`)
    return {status: 200}
  /**
   * Create a new MercadoLibre item listing.
   *
   * @param {Account} account   - the account that will post the item
   * @param {*} item            - the item JSON to be posted
   * @returns {Promise<*>} resolves to the posted item.
   * @throws error if:
   *  - invalid item JSON
   *  - Meli API error
   *
   */
  async createListing(account, item) {
    const postRequest = {
      method: 'POST',
      uri: POST_ITEM_URL,
      qs: {
        access_token: account.auth.accessToken
      },
      body: item,
      json: true
    }
    let itemResponse
    try {
      itemResponse = await req(postRequest)
    } catch (error) {
      const errMsg = `Could not post the item ${JSON.stringify(item)}. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return itemResponse
  }

  /**
   * Get item listings from specified Account
   *
   * @param {Account} account - the account where to get listings from
   * @returns {Promise<Array<*>>} request promise, resolves to listings response
   */
  async getListings(account) {
    let itemIdsResponse = await this._getListingIds(account)
    let listings
    try {
      listings = await Promise.map(itemIdsResponse, (itemId) =>
        this.getListingById(account, itemId)
      )
    } catch (error) {
      const errMsg = `Could not get listing ids. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return listings
  }

  /**
   * Get specific listing by item listing id
   *
   * @param {Account} account - the authorized account to do the request.
   * @param {String} itemId   - the expected item listing id.
   *
   * @returns {Promise<*>} request promise, resolves to listing json response
   */
  getListingById(account, itemId) {
    const getRequestBuilder = {
      uri: GET_ITEM_BY_ID(itemId),
      qs: {
        access_token: account.auth.accessToken
      },
      json: true
    }

    return req(getRequestBuilder)
  }

  /**
   * Get account listing ids
   * @param account
   * @returns {Promise<Array<string>>} - request promise, resolves to listing ids response
   * @private
   */
  async _getListingIds(account) {
    const getRequest = {
      uri: GET_ITEM_IDS_URL(account.id),
      qs: {
        access_token: account.auth.accessToken
      },
      json: true
    }
    let response
    try {
      response = await req(getRequest)
    } catch (error) {
      const errMsg = `Could not get the listing ids for user id ${account.id}. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return response.results || []
  }

  /**
   *
   * @param {Account} askingAccount - the account that is asking
   * @param {string} itemId         - the item where to post
   * @param {string} question       - the question text
   * @returns {Promise<*>} request promise, resolves to the posted question result
   */
  async postQuestion(askingAccount, itemId, question) {
    const postRequest = {
      method: 'POST',
      uri: POST_QUESTION_URL(itemId),
      qs: {
        access_token: askingAccount.auth.accessToken
      },
      body: {text: question, item_id: itemId},
      json: true
    }
    let postedQuestion
    try {
      postedQuestion = await req(postRequest)
    } catch (error) {
      const errMsg = `Could not post the question ${JSON.stringify(postRequest.body)}. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return postedQuestion
  }

  async refreshAccountAuth(account) {
    if (account.isAuthorized()) {
      return
    }
    console.log(`Token for ${account.nickname} expired. Refreshing...`)
    try {
      await this.refreshAccessToken(account)
    } catch (error) {
      let originalMessage
      try {
        originalMessage = (error.data && JSON.parse(error.data).message) || error.message || ''
      } catch (error) {
        console.error(`Could not JSON.parse(error.data) on error of refreshAccessToken(): \n${JSON.stringify(error)}`)
      }
      error.message = `Could not refresh token for ${account.nickname}. Cause: ${originalMessage}`
      throw error
    }
    console.log(`Refresh token success for ${account.nickname}`)
  }

  async refreshAccessToken(account) {
    account.checkRefreshable()
    const accessToken = await refresh.requestNewAccessToken('mercadolibre', account.auth.refreshToken)
    await account.updateAccessToken(accessToken)
  }

  async authenticate(accounts) {
    return Promise.filter(accounts, async acc => {
      try {
        await this.refreshAccountAuth(acc)
      } catch (error) {
        // TODO update Account status error.
        console.log('Problem refreshing account authentication: ', error)
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
