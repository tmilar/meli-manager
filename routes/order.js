const router = require('express').Router();
const moment = require('moment');
const Account = require('../model/account');
const OrderService = require("../service/orders.service.js");
const Promise = require("bluebird");

/**
 * @param start - start date range, format 'MM-DD-YY'
 * @param end - end date range, format 'MM-DD-YY', default today.
 * @param accounts - pick specific account usernames instead of all.
 *
 */
router.get('/', async (req, res, next) => {
    let {start, end, accounts, store} = req.query;

    // parse params
    let dateStart = start && moment(start, 'DD-MM-YY').toDate();
    let dateEnd = end && moment(end, 'DD-MM-YY').endOf('day').toDate();
    let nicknamesFilter = accounts ? {nickname: {$in: JSON.parse(accounts)}} : {};
    let shouldStore = store === "true" || store === "1";

    let orders = [];

    //// *** orders service ***
    try {
        // 1. get accounts from DB
        let selectedAccounts = await Account.find(nicknamesFilter).exec();

        // 2. fetch remote orders for accounts
        orders = await OrderService.fetchMeliOrders(dateStart, dateEnd, selectedAccounts);

        // 3. store selected orders
        if (shouldStore) {
            await Promise.mapSeries(orders, o => OrderService.saveNewOrder(o));
        }
    } catch (e) {
        return next(e);
    }

    res.json(orders);
});

module.exports = router;
