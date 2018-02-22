const SheetsHelper = require("../lib/sheetsHelper");
const Order = require("../model/order.js");

class OrdersService {

    static async saveNewOrder(sheet, newOrderBody) {
        let newOrder = Order.buildFromMeliOrder(newOrderBody);
        let orderRow = newOrder.toRowArray();
        let newRowPosition = await SheetsHelper.getNextEmptyRowPosition(sheet);
        await SheetsHelper.ensureSheetSpace(sheet, newRowPosition);
        await SheetsHelper.setRowValuesInRowCells(sheet, orderRow, newRowPosition);
    }
}


module.exports = OrdersService;