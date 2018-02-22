const OrdersService = require('./service/ordersService');
const SheetsHelper = require('./lib/sheetsHelper');

// config setup
const credentials = require('./client_secret.json');
const config = require("./config.json");
const ordersSpreadsheet = config.spreadsheet.orders;

main();

async function main() {
    const ordersSheet = await SheetsHelper.setupSheet({
        credentials,
        spreadsheetsKey: ordersSpreadsheet.id,
        sheetName: ordersSpreadsheet.sheet
    });

    await updateSomeOrders(ordersSheet);
}

async function updateSomeOrders(sheet) {
    const newOrderSampleJSON = require("./data/order_sample.json");
    await OrdersService.saveNewOrder(sheet, newOrderSampleJSON);

    // TODO implement updateOrder
    // await updateOrder({sheet, row: 5}, {estadodeventa: 'Cancelada'});
}