const Promise = require('bluebird')
const {Strategy: MercadoLibreStrategy} = require('passport-mercadolibre')
const passport = require('passport')
const refresh = require('passport-oauth2-refresh')
const Account = require('../model/account')

const {clientId, clientSecret} = require('.').auth.mercadolibre

if (!clientId) {
  throw new Error('MercadoLibre clientId must be defined in MELI_CLIENT_ID env variable')
}

if (!clientSecret) {
  throw new Error('MercadoLibre clientSecret must be defined in MELI_CLIENT_SECRET env variable')
}

const meliAuth = {
  onAuthSuccess: async (profile, tokens) => {
    // Default: register profile to DB, together with access and refresh tokens
    await Account.register(profile, tokens)
  },
  passport,
  refresh
}

/**
 * Callback after Mercadolibre authorization.
 * Uses default meliAuth.onAuthSuccess() callback, but it can be overwritten for custom logic ie. CLI app.
 *
 * @param accessToken
 * @param refreshToken
 * @param profile
 * @param done
 * @returns {Promise<*>}
 */
const authorizedCb = async (accessToken, refreshToken, profile, done) => {
  const tokens = {accessToken, refreshToken}
  await meliAuth.onAuthSuccess(profile, tokens)
  return done(null, profile)
}

/**
 * Setup mercadolibre passport Strategy.
 *
 * @type {Strategy}
 */
const mercadoLibreStrategy = new MercadoLibreStrategy({
  clientID: clientId,
  clientSecret,
  callbackURL: '/auth/mercadolibre/callback'
},
authorizedCb
)
passport.use(mercadoLibreStrategy)

refresh.use(mercadoLibreStrategy)

// Add promise support to refresh
refresh.requestNewAccessToken = Promise.promisify(refresh.requestNewAccessToken)

module.exports = meliAuth
