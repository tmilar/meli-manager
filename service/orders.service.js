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
        if (this.ready) return;

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
     * @param accounts - {mongoose model}
     * @returns {Promise.<void>}
     */
    static async fetchMeliOrders(startDate, endDate, accounts) {
        let apiUrl = "https://api.mercadolibre.com/orders/search";

        // Build the request URLs for selected accounts.
        // If 401 unauthorized, refresh and retry.
        let orderRequests = Promise.mapSeries(accounts, acc => ({
            acc, orderRequest: apiUrl + `?seller=${acc.id}&access_token=${acc.auth.accessToken}&sort=date_desc`
        }))
            .mapSeries(({acc, orderRequest}) =>
                req({uri: orderRequest, json: true})
                    .catch((e) => {
                        if (e.statusCode && e.statusCode === 401) {
                            console.log(`Token for ${acc.nickname} expired. Attempting to refresh and retry...`);
                            return acc.refreshToken()
                                .then(() => apiUrl + `?seller=${acc.id}&access_token=${acc.auth.accessToken}&sort=date_desc`)
                                .then((newOrderRequest) =>
                                    req({uri: newOrderRequest, json: true})
                                );
                        }
                        console.log("Something bad happened... ", e);
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
}


module.exports = OrdersService;