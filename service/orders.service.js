const req = require('request-promise')
const Promise = require('bluebird')
const SheetsHelper = require('../lib/sheets-helper')
const Order = require('../model/order.js')
const config = require('../config')

class OrdersService {
  /**
     * Setup Order service spreadsheet reference.
     * TODO move this to some initial configuration place...
     *
     * @returns {Promise.<void>}
     */
  static async setup() {
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

  static async saveNewOrder(newOrderJson) {
    const newOrder = Order.buildFromMeliOrder(newOrderJson)
    const orderRow = newOrder.toRowArray()
    const newRowPosition = await this.ordersSheet.getNextEmptyRowPosition()
    await this.ordersSheet.ensureSheetSpace(newRowPosition)
    await this.ordersSheet.setRowValuesInRowCells(orderRow, newRowPosition)
  }

  static async updateOrder(updatedOrderJson, rowPosition) {
    const order = Order.buildFromMeliOrder(updatedOrderJson)

    const orderRow = order.toRowArray({update: true})

    await this.ordersSheet.setRowValuesInRowCells(orderRow, rowPosition)
  }

  /**
     * For all accounts, fetch all Meli orders between desired dates.
     *
     * @param startDate
     * @param endDate
     * @param accounts - {mongoose model}
     * @param id - fetch by order id
     * @returns {Promise.<void>}
     */
  static async fetchMeliOrders({startDate, endDate, accounts, id}) {
    const apiUrl = 'https://api.mercadolibre.com/orders/search'

    // Build the request URLs for selected accounts.
    const orderRequests = Promise.mapSeries(accounts, acc => ({
      acc,
      orderRequest: apiUrl + `?seller=${acc.id}&access_token=${acc.auth.accessToken}&sort=date_desc${id ? `&q=${id}` : ''}`
    }))
      .mapSeries(({acc, orderRequest}) =>
        req({uri: orderRequest, json: true})
          .catch(e => {
            e.message = `Problem with meli orders request for ${acc.nickname}. ${e.message} `
            throw e
          })
      )

    // Get request responses
    const ordersResponses = await orderRequests

    // Flatten responses to one array
    const orders = ordersResponses
      .map(ordersResponse => ordersResponse.results)
      .reduce((arr = [], order) => arr.concat(order))

    // Filter orders between startDate & endDate. Also exclude orders from own accounts.
    const filteredOrders = orders
      .filter(order =>
        (!startDate || (new Date(order.date_closed) >= startDate)) &&
                (!endDate || (new Date(order.date_closed) <= endDate))
      ).filter(order => // Not from one of our accounts
        !accounts.map(a => a.nickname).includes(order.buyer.nickname)
      )

    // Sort orders by "date_closed" asc.
    const filteredOrdersSorted = filteredOrders.sort((a, b) => new Date(a.date_closed) - new Date(b.date_closed))

    return filteredOrdersSorted
  }

  /**
     * Fetch one specific order by account and id.
     *
     * @param account - {mongoose account holding the order}
     * @param id      - orderId
     * @returns {Promise.<null>} - order object
     */
  static async fetchOneMeliOrder(account, id) {
    const orders = await this.fetchMeliOrders({accounts: [account], id})
    return (orders && orders.length > 0) ? orders[0] : null
  }

  static async saveOrUpdateOrder(orderJson) {
    /*
         Let ordersByRows = await this.ordersSheet.getAllRows();

         let orderRowsById = ordersByRows.filter(o => Order.getIdFromRowObject(o) === orderJson.id);
         orderRowsById.forEach(o => o.formapago = "caca");
         let update = Promise.mapSeries(orderRowsById, o => {
         console.log("Saving... ", o);
         return o.save();
         })
         .then(() => console.log("Done"));

         return update;
         */
    const orderRowPositions = await this.findOrderRowPositions(orderJson)

    if (orderRowPositions && orderRowPositions.length >= 1) {
      // Update existing row(s)
      return Promise.mapSeries(orderRowPositions, ({rowPosition}) => {
        console.log('Updating existing order...')
        return this.updateOrder(orderJson, rowPosition)
      })
    }
    // Save new row
    console.log('Saving new order row...')
    await this.saveNewOrder(orderJson)
  }

  static async findOrderRowPositions({id}) {
    const orderIdColumn = Order.getIdColumn().colPos
    const ordersIdsColumn = await this.ordersSheet.getAllCellsByColumn({col: orderIdColumn})
    const orderRowPositions = ordersIdsColumn
      .map((orderIdCell, rowPosition) => ({orderIdCell, rowPosition}))
      .filter(({orderIdCell}) => Order.extractIdFromCellValue(orderIdCell) === id)

    return orderRowPositions
  }
}

OrdersService
  .setup()
  .then(() => console.log('Orders Service ready.'))

module.exports = OrdersService
