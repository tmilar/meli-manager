const Promise = require('bluebird')
const {Strategy: MercadoLibreStrategy} = require('passport-mercadolibre')
const passport = require('passport')
const refresh = require('passport-oauth2-refresh')
const Account = require('../model/account')

const {clientId, clientSecret} = require('.').auth.mercadolibre

const mercadoLibreStrategy = new MercadoLibreStrategy({
  clientID: clientId,
  clientSecret,
  callbackURL: '/auth/mercadolibre/callback'
},
  (async (accessToken, refreshToken, profile, cb) => {
    // + store/retrieve user from database, together with access token and refresh token
    await Account.register(profile, {accessToken, refreshToken})
    return cb(null, profile)
  })
)
passport.use(mercadoLibreStrategy)

refresh.use(mercadoLibreStrategy)

// Add promise support to refresh
refresh.requestNewAccessToken = Promise.promisify(refresh.requestNewAccessToken)

const meliAuth = {
  passport,
  refresh
}

module.exports = meliAuth
