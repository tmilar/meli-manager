/* eslint-disable camelcase */
const Promise = require('bluebird')
const req = require('request-promise')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  _buildUrl(resource, data) {
    let resourceUrl = resource
    if (typeof resource === 'function') {
      if (!data) {
        throw new Error(`Could not build request url, no data defined for '${resource}' request.`)
      }
      resourceUrl = resource(data)
      if (!resourceUrl) {
        throw new Error(`Malformed request using data ${JSON.stringify(data)} for 'resource' builder ${resource}.`)
      }
    }
    return `${this.baseUrl}${resourceUrl}`
  }

  _buildQs(qs, account) {
    if (typeof qs !== 'function') {
      return qs
    }
    return qs(account)
  }

  _buildRequestOptions({method = 'GET', resource, data, account, qs = {}, body = undefined}) {
    return {
      method,
      uri: this._buildUrl(resource, data),
      qs: {
        access_token: account.auth.accessToken,
        ...this._buildQs(qs, account)
      },
      body,
      json: true
    }
  }

  async get({resource, data, qs, account}) {
    const options = this._buildRequestOptions({resource, data, account, qs})
    return req(options)
  }

  async post({resource, data, qs, body, account}) {
    const options = this._buildRequestOptions({method: 'POST', resource, data, account, qs, body})
    return req(options)
  }

  async multiAccountGet(accounts, {resource, data, qs}) {
    if (!accounts || (Array.isArray(accounts) && accounts.length === 0)) {
      throw new Error('Must use at least one account.')
    }

    return Promise.map(accounts, async account => {
      let response

      try {
        response = await this.get({resource, data, qs, account})
      } catch (error) {
        response = error.error || error || {}
        response.message = `Problem with GET '${resource}' request for ${account.nickname}. Msg: ${error.message}`
      }
      return {account, response}
    })
  }
}

class MeliClient {
  constructor() {
    this.accounts = []

    this.baseUrl = 'https://api.mercadolibre.com'
    this.resources = {
      GET: {
        orders: '/orders/search',
        questions: '/my/received_questions/search',
        question: questionId => `/questions/${questionId}`,
        itemIds: userId => `/users/${userId}/items/search`,
        item: itemId => `/items/${itemId}`
      },
      POST: {
        item: '/items',
        question: itemId => `/questions/${itemId}`,
        answer: '/answers'
      }
    }

    this.client = new Client(this.baseUrl)
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

  /**
   *
   * @param {Array<Account>} [accounts] - selected accounts
   * @param {number}         [id]       - get only specified order id
   * @returns {Promise<Array>} orders response, grouped by account
   */
  async getOrders({accounts, id} = {}) {
    const authenticatedAccounts = await this.filterAccounts(accounts)

    const resource = this.resources.GET.orders
    const qs = account => ({
      seller: account.id,
      sort: 'date_desc',
      q: id
    })

    return this.client.multiAccountGet(authenticatedAccounts, {resource, qs})
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

    const resource = this.resources.GET.questions
    const qs = {
      sort_fields: 'date_created',
      sort_types: 'DESC',
      status
    }

    const mapQuestionsResponse = ({account, response}) => {
      response.results = response.questions // Map meli response to match meliClient response structure
      return {account, response}
    }

    const response = await this.client.multiAccountGet(authenticatedAccounts, {resource, qs})
    return response.map(mapQuestionsResponse)
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

    const resource = this.resources.GET.question
    const data = id

    const mapQuestionResponse = ({response}) => {
      const emptyAccount = {}
      if (!response || (response.status && response.error) || !response.seller_id) {
        // No question, return an empty account object + error info
        return {account: emptyAccount, response}
      }

      const sellerAccount = authenticatedAccounts.find(acc => acc.id === response.seller_id) || emptyAccount
      return {account: sellerAccount, response}
    }

    const response = await this.client.multiAccountGet(singleAccountArray, {resource, data})
    return response.map(mapQuestionResponse)
  }

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
    const [authenticatedAccount] = await this.filterAccounts([account])

    const resource = this.resources.POST.item
    const body = item

    let itemResponse
    try {
      itemResponse = await this.client.post({resource, body, account: authenticatedAccount})
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
    const [authenticatedAccount] = await this.filterAccounts([account])

    const itemIdsResponse = await this._getListingIds(authenticatedAccount)
    let listings
    try {
      listings = await Promise.map(itemIdsResponse, itemId =>
        this.getListingById(authenticatedAccount, itemId)
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
  async getListingById(account, itemId) {
    const [authenticatedAccount] = await this.filterAccounts([account])

    const resource = this.resources.GET.item
    const data = itemId

    return this.client.get({resource, data, account: authenticatedAccount})
  }

  /**
   * Get account listing ids
   * @param {Account} account - the authorized account to do the request.
   * @returns {Promise<Array<string>>} - request promise, resolves to listing ids response
   * @private
   */
  async _getListingIds(account) {
    const resource = this.resources.GET.itemIds
    const data = account.id

    let response
    try {
      response = await this.client.get({resource, data, account})
    } catch (error) {
      const errMsg = `Could not get the listing ids for user id ${account.id}. ` +
        `Reason: ${error.message || error.data || error || ''}`
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
    const [authenticatedAskingAccount] = await this.filterAccounts([askingAccount])

    const resource = this.resources.POST.question
    const data = itemId
    const body = {text: question, item_id: data}

    let postedQuestion
    try {
      postedQuestion = await this.client.post({resource, data, body, account: authenticatedAskingAccount})
    } catch (error) {
      const errMsg = `Could not post the question ${JSON.stringify(body)}. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return postedQuestion
  }

  async postQuestionAnswer(asnweringAccount, questionId, answer) {
    const [authenticatedAsnweringAccount] = await this.filterAccounts([asnweringAccount])

    const resource = this.resources.POST.answer
    const body = {text: answer, question_id: questionId}
    let questionAnswered
    try {
      questionAnswered = await this.client.post({resource, body, account: authenticatedAsnweringAccount})
    } catch (error) {
      const errMsg = `Could not post the answer ${JSON.stringify(body)}. Reason: ${error.message || error.data || error || ''}`
      throw new Error(errMsg)
    }
    return questionAnswered
  }
}

module.exports = MeliClient
