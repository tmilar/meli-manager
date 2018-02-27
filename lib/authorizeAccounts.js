const Account = require("../model/account");
const Promise = require("bluebird");

/**
 * Check that the Mercadolibre accounts tokens are not expired, otherwise refresh them.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<void>}
 */
const accountsAuthorized = async (req, res, next) => {
    let accountsFilter = req.query.accounts ? {nickname: {$in: JSON.parse(req.query.accounts)}} : {};
    let accounts = await Account.find(accountsFilter);

    await Promise.map(accounts, acc => {
        if (!acc.isAuthorized()) {
            console.log(`Token for ${acc.nickname} expired. Refreshing...`);
            return acc.refreshToken()
                .then(() => console.log(`Refresh token success for ${acc.nickname}`))
                .catch(() => console.log(`Could not refresh token for ${acc.nickname}.`, e));
        }
    });

    next();
};

module.exports = accountsAuthorized;