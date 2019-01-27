const SheetsHelper = require('../lib/sheets-helper')
const Order = require('../model/order.js')
const config = require('../config')
const MeliClient = require('../lib/meli-client.js')

class OrdersService {
  /**
   * Setup Order service spreadsheet reference.
   *
   */
  static async setup() {
    this.setupMeliClient()
    await this.setupOrdersSheet()

    console.log('[OrdersService] setup ready')
  }

  static setupMeliClient() {
    if (this.meliClient) {
      return
    }

    this.meliClient = new MeliClient()
  }

  static async setupOrdersSheet() {
    if (this.ordersSheet) {
      return
    }

    const ordersSpreadsheet = config.spreadsheet.orders

    this.ordersSheet = new SheetsHelper()
    this.headerRowHeight = 1
    this.headerRowWidth = Order.getColumns().keys().length

    await this.ordersSheet.setupSheet({
      credentials: config.auth.spreadsheet,
      spreadsheetsKey: ordersSpreadsheet.id,
      sheetName: ordersSpreadsheet.sheet,
      headerRowHeight: this.headerRowHeight,
      headerRowWidth: this.headerRowWidth
    })
  }

  static async saveOrUpdateOrder(orderJson) {
    const order = Order.buildFromMeliOrder(orderJson)
    const orderRow = order.toRowArray()
    const {colPos: orderIdColumn} = Order.getIdColumn()
    console.log('Saving order row...')
    await this.ordersSheet.updateOrAppendRow(orderRow, orderIdColumn)
  }


  /**
   * For all accounts, fetch all Meli orders between desired dates.
   *
   * @param {date} [startDate] - filter to retrieve results on or after this date only. Optional.
   * @param {date} [endDate] - filter to retrieve results up to this date only. Optional.
   * @param {[Account]} [accounts] - filter to retrieve results of these accounts only. Optional.
   * @param {number|string} [id] - filter to fetch only one specific order by id
   *
   * @returns {[*]} all the meli orders for the selected accounts, ordered by date_closed.
   */
  static async fetchMeliOrders({startDate, endDate, accounts, id}) {
    const ordersResponses = await this.meliClient.getOrders({startDate, endDate, accounts, id})

    // Flatten responses to one array
    const orders = ordersResponses
      .map(ordersResponse => ordersResponse.response.results)
      .reduce((arr = [], order) => arr.concat(order), [])

    // Exclude orders that are from our own accounts.
    const filteredOrders = orders.filter(order =>
      !accounts.map(a => a.nickname).includes(order.buyer.nickname)
    )

    // Sort orders by "date_closed" asc.
    const filteredOrdersSorted = filteredOrders.sort((a, b) => new Date(a.date_closed) - new Date(b.date_closed))

    return filteredOrdersSorted
  }

  /**
   * Fetch one specific order by account and id.
   *
   * @param {Account} account - the selected account . Optional.
   * @param {number|string} [id] - meli order id
   *
   * @returns {Promise.<{}|null>} - resolves order object, or null if not found
   */
  static async fetchOneMeliOrder(account, id) {
    const orders = await this.fetchMeliOrders({accounts: [account], id})
    return (orders && orders.length > 0) ? orders[0] : null
  }
}

module.exports = OrdersService
