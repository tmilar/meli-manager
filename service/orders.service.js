const SheetsHelper = require("../lib/sheetsHelper");
const Order = require("../model/order.js");
const req = require('request-promise');
const config = require('../config');
const Promise = require('bluebird');

class OrdersService {

    /**
     * Setup Order service spreadsheet reference.
     * TODO move this to some initial configuration place...
     *
     * @returns {Promise.<void>}
     */
    static async setup() {
        if (this.ordersSheet) return;

        const ordersSpreadsheet = config.spreadsheet.orders;

        this.ordersSheet = new SheetsHelper();
        this.headerRowHeight = 1;
        this.headerRowWidth = Order.getColumns().keys().length;

        await this.ordersSheet.setupSheet({
            credentials: config.auth.spreadsheet,
            spreadsheetsKey: ordersSpreadsheet.id,
            sheetName: ordersSpreadsheet.sheet,
            headerRowHeight: this.headerRowHeight,
            headerRowWidth: this.headerRowWidth
        });
    }

    static async saveNewOrder(newOrderJson) {
        let newOrder = Order.buildFromMeliOrder(newOrderJson);
        let orderRow = newOrder.toRowArray();
        let newRowPosition = await this.ordersSheet.getNextEmptyRowPosition();
        await this.ordersSheet.ensureSheetSpace(newRowPosition);
        await this.ordersSheet.setRowValuesInRowCells(orderRow, newRowPosition);
    }

    static async updateOrder(updatedOrderJson, rowPosition) {
        let order = Order.buildFromMeliOrder(updatedOrderJson);

        let orderRow = order.toRowArray({update: true});

        await this.ordersSheet.setRowValuesInRowCells(orderRow, rowPosition);
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
        let apiUrl = "https://api.mercadolibre.com/orders/search";

        // Build the request URLs for selected accounts.
        let orderRequests = Promise.mapSeries(accounts, acc => ({
            acc,
            orderRequest: apiUrl + `?seller=${acc.id}&access_token=${acc.auth.accessToken}&sort=date_desc${id ? `&q=${id}` : ''}`
        }))
            .mapSeries(({acc, orderRequest}) =>
                req({uri: orderRequest, json: true})
                    .catch((e) => {
                        e.message = `Problem with meli orders request for ${acc.nickname}. ${e.message} `;
                        throw e;
                    })
            );

        // Get request responses
        let ordersResponses = await orderRequests;

        // Flatten responses to one array
        let orders = ordersResponses
            .map(ordersResponse => ordersResponse.results)
            .reduce((arr = [], order) => arr.concat(order));

        // Filter orders between startDate & endDate. Also exclude orders from own accounts.
        let filteredOrders = orders
            .filter(order =>
                (!startDate || (new Date(order["date_closed"]) >= startDate)) &&
                (!endDate || (new Date(order["date_closed"]) <= endDate))
            ).filter(order => // not from one of our accounts
                !accounts.map(a => a.nickname).includes(order["buyer"]["nickname"])
            );

        // sort orders by "date_closed" asc.
        let filteredOrdersSorted = filteredOrders.sort((a, b) => new Date(a["date_closed"]) - new Date(b["date_closed"]));

        return filteredOrdersSorted;
    }

    /**
     * Fetch one specific order by account and id.
     *
     * @param account - {mongoose account holding the order}
     * @param id      - orderId
     * @returns {Promise.<null>} - order object
     */
    static async fetchOneMeliOrder(account, id) {
        let orders = await this.fetchMeliOrders({accounts: [account], id});
        return (orders && orders.length > 0) ? orders[0] : null;
    }

    static async saveOrUpdateOrder(orderJson) {

        /*
         let ordersByRows = await this.ordersSheet.getAllRows();

         let orderRowsById = ordersByRows.filter(o => Order.getIdFromRowObject(o) === orderJson.id);
         orderRowsById.forEach(o => o.formapago = "caca");
         let update = Promise.mapSeries(orderRowsById, o => {
         console.log("Saving... ", o);
         return o.save();
         })
         .then(() => console.log("Done"));

         return update;
         */
        let orderRowPositions = await this.findOrderRowPositions(orderJson);

        if (orderRowPositions && orderRowPositions.length >= 1) {
            // update existing row(s)
            return Promise.mapSeries(orderRowPositions, ({rowPosition}) => {
                console.log("Updating existing order...");
                return this.updateOrder(orderJson, rowPosition);
            })
        } else {
            // save new row
            console.log("Saving new order row...");
            await this.saveNewOrder(orderJson);
        }
    }

    static async findOrderRowPositions({id}) {
        let orderIdColumn = Order.getIdColumn().colPos;
        let ordersIdsColumn = await this.ordersSheet.getAllCellsByColumn({col: orderIdColumn});
        let orderRowPositions = ordersIdsColumn
            .map((orderIdCell, rowPosition) => ({orderIdCell, rowPosition}))
            .filter(({orderIdCell}) => Order.extractIdFromCellValue(orderIdCell) === id);

        return orderRowPositions;
    }
}

OrdersService
    .setup()
    .then(() => console.log("Orders Service ready."));

module.exports = OrdersService;