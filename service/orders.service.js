const SheetsHelper = require("../lib/sheetsHelper");
const Order = require("../model/order.js");

class OrdersService {

    constructor({sheet}) {
        this.ordersSheet = sheet;
    }

    async saveNewOrder(newOrderBody) {
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
     * @returns {Promise.<void>}
     */
    async fetchOrdersBetweenDates(startDate, endDate=new Date()) {
        let url = "";

    }
}


module.exports = OrdersService;