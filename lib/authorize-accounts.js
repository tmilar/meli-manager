const Promise = require('bluebird')
const Account = require('../model/account')
const MeliClient = require('../lib/meli-client')

const meliClient = new MeliClient()
/**
 * Check that the Mercadolibre accounts tokens are not expired, otherwise refresh them.
 *
 * @param req
 * @param res
 * @param next
 * @returns {Promise.<void>}
 */
const accountsAuthorized = async (req, res, next) => {
  const accountsFilter = req.query.accounts ? {nickname: {$in: JSON.parse(req.query.accounts)}} : {}
  const accounts = await Account.find(accountsFilter)

  await Promise.map(accounts, acc => {
    if (!acc.isAuthorized()) {
      console.log(`Token for ${acc.nickname} expired. Refreshing...`)
      return meliClient.refreshAccountAuth(acc)
        .then(() => console.log(`Refresh token success for ${acc.nickname}`))
        .catch(e => console.log(`Could not refresh token for ${acc.nickname}.`, e))
    }
  })

  next()
}

module.exports = accountsAuthorized
