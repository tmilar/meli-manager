const router = require('express').Router();
const moment = require('moment');
const Account = require('../model/account');
const OrderService = require("../service/orders.service.js");
const Promise = require("bluebird");


/**
 * Check that the Mercadolibre accounts tokens are not expired, otherwise refresh them.
 * TODO move this middleware function to a better place?
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<void>}
 */
let accountsAuthorized = async (req, res, next) => {
    let accountsFilter = req.query.accounts ? {nickname: {$in: JSON.parse(req.query.accounts)}} : {};
    let accounts = await Account.find(accountsFilter);

    await Promise.mapSeries(accounts, acc => {
        if (!acc.isAuthorized()) {
            console.log(`Token for ${acc.nickname} expired. Refreshing...`);
            return acc.refreshToken()
                .catch(() => console.log(`Could not refresh token for ${acc.nickname}.`, e));
        }
    });

    next();
};

/**
 * @param start - start date range, format 'MM-DD-YY'
 * @param end - end date range, format 'MM-DD-YY', default today.
 * @param accounts - pick specific account usernames instead of all.
 *
 */
router.get('/', accountsAuthorized, async (req, res, next) => {
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
            req.setTimeout(0); // no timeout, so client can wait for the result.
            await Promise.mapSeries(orders, o => OrderService.saveNewOrder(o));
        }
    } catch (e) {
        console.log("Something bad happened at /order", e);
        return next(e);
    }

    res.json(orders);
});

module.exports = router;
