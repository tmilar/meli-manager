const {spreadsheet, mercadolibre} = require('../secrets.json');

const config = {
    db: process.env.NODE_ENV === 'production' ?
        process.env.MONGODB_URL :
        (process.env.MONGODB_URL || 'mongodb://localhost/melimgr'),
    spreadsheet: {
        orders: {
            id: "1CPwBbJaDwLbv80S5__LK8_5LZOQ5NE5_zXo45um1LNQ",
            sheet: "Ventas 2018",
            sheetId: 1
        },
        customers: {
            id: "1CPwBbJaDwLbv80S5__LK8_5LZOQ5NE5_zXo45um1LNQ",
            sheet: "Clientes"
        }
    },
    secrets: {
        mercadolibre: {
            clientId: process.env.MELI_CLIENT_ID || mercadolibre.id,
            clientSecret: process.env.MELI_CLIENT_SECRET || mercadolibre.secret_key
        },
        spreadsheet
    }
};

module.exports = config;