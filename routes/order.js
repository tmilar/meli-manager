const router = require('express').Router()
const moment = require('moment')
const Promise = require('bluebird')
const Account = require('../model/account')
const OrderService = require('../service/orders.service.js')

/**
 * @param start - start date range, format 'MM-DD-YY'
 * @param end - end date range, format 'MM-DD-YY', default today.
 * @param accounts - pick specific account usernames instead of all.
 *
 */
router.get('/', async (req, res, next) => {
  const {start, end, accounts, store} = req.query

  // Parse params
  const dateStart = start && moment(start, 'DD-MM-YY').toDate()
  const dateEnd = end && moment(end, 'DD-MM-YY').endOf('day').toDate()

  let accountsArray
  if (accounts) {
    try {
      accountsArray = JSON.parse(accounts)
    } catch (error) {
      // Param 'accounts' is invalid JSON, split the string by ',' separator
      accountsArray = accounts.split(',')
    }
  }

  const nicknamesFilter = accountsArray ? {nickname: {$in: accountsArray}} : {}
  const shouldStore = store === 'true' || store === '1'

  let orders = []

  /// / *** orders service ***
  try {
    // 1. get accounts from DB
    const selectedAccounts = await Account.find(nicknamesFilter)

    // 2. fetch remote orders for accounts
    const meliOrderFilters = {startDate: dateStart, endDate: dateEnd, accounts: selectedAccounts}
    orders = await OrderService.fetchMeliOrders(meliOrderFilters)

    // 3. store selected orders
    if (shouldStore) {
      req.setTimeout(0) // No timeout, so client can wait for the result.
      await Promise.mapSeries(orders, o => OrderService.saveNewOrder(o))
    }
  } catch (error) {
    console.log('Something bad happened at /order', error)
    return next(error)
  }

  res.json(orders)
})

module.exports = router
