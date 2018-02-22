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
}


module.exports = OrdersService;