const OrdersService = require('./service/ordersService');
const SheetsHelper = require('./lib/sheetsHelper');

// config setup
const credentials = require('./secrets.json').spreadsheet;
const config = require("./config.json");

main();

async function main() {
    const ordersSpreadsheet = config.spreadsheet.orders;

    const ordersSheet = await SheetsHelper.setupSheet({
        credentials,
        spreadsheetsKey: ordersSpreadsheet.id,
        sheetName: ordersSpreadsheet.sheet
    });

    await updateSomeOrders(ordersSheet);
}

async function updateSomeOrders(ordersSheet) {
    const ordersService = new OrdersService({sheet: ordersSheet});

    const newOrderSampleJSON = require("./data/order_sample.json");
    await ordersService.saveNewOrder(newOrderSampleJSON);

    // TODO implement updateOrder
    // await updateOrder({sheet, row: 5}, {estadodeventa: 'Cancelada'});
}