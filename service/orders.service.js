const SheetsHelper = require("../lib/sheetsHelper");
const Order = require("../model/order.js");
const req = require('request-promise');
const config = require('../config');

class OrdersService {
/*
    constructor({sheet}) {
        this.ordersSheet = sheet;
    }
*/
    static async setup() {
        if(this.ready) return;

        const ordersSpreadsheet = config.spreadsheet.orders;

        this.ordersSheet = await SheetsHelper.setupSheet({
            credentials: config.secrets.spreadsheet,
            spreadsheetsKey: ordersSpreadsheet.id,
            sheetName: ordersSpreadsheet.sheet
        });

        this.ready = true;
    }

    static async saveNewOrder(newOrderBody) {
        /* // TODO make the sheets helper *be* the actual empowered sheet...
         const ordersSheet = await SheetsHelper.setupSheet({
         credentials: config.secrets.spreadsheet,
         spreadsheetsKey: ordersSpreadsheet.id,
         sheetName: ordersSpreadsheet.sheet
         });
         */

        // TODO don't do the setup here... move elsewhere...
        await this.setup();

        let newOrder = Order.buildFromMeliOrder(newOrderBody);
        let orderRow = newOrder.toRowArray();
        let newRowPosition = await SheetsHelper.getNextEmptyRowPosition(this.ordersSheet);
        await SheetsHelper.ensureSheetSpace(this.ordersSheet, newRowPosition);
        await SheetsHelper.setRowValuesInRowCells(this.ordersSheet, orderRow, newRowPosition);
    }

    /**
     * For all accounts, fetch all Meli orders between desired dates.
     *
     * @param startDate
     * @param endDate
     * @param accounts
     * @returns {Promise.<void>}
     */
    static async fetchMeliOrders(startDate, endDate, accounts) {
        let apiUrl = "https://api.mercadolibre.com/orders/search";

        // Build the request URLs for selected accounts
        let orderRequests = accounts
            .map(acc => apiUrl + `?seller=${acc.id}&access_token=${acc.auth.accessToken}&sort=date_desc`)
            .map(orderRequest => req({uri: orderRequest, json: true}));

        // Get request responses
        let ordersResponses = await Promise.all(orderRequests);

        // Flatten responses to one array
        let orders = ordersResponses
            .map(ordersResponse => ordersResponse.results)
            .reduce((arr=[], order) => arr.concat(order) );

        // Filter orders between startDate & endDate
        let filteredOrders = orders.filter(order =>
            (!startDate || (new Date(order["date_closed"]) >= startDate)) &&
            (!endDate || (new Date(order["date_closed"]) <= endDate))
        );

        // sort orders by "date_closed"
        let filteredOrdersSorted = filteredOrders.sort((a,b) => new Date(a["date_closed"]) - new Date(b["date_closed"]));

        return filteredOrdersSorted;
    }
}


module.exports = OrdersService;