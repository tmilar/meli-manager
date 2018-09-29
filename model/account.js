const mongoose = require('mongoose')
const {auth: {mercadolibre: {clientId: currentClientId}}} = require('../config')

const TIME_NEW_ACCOUNT_MILLIS = 1000 * 60 // 1 minute

const accountSchema = new mongoose.Schema({
  id: Number,
  nickname: String,
  firstName: String,
  lastName: String,
  email: String,
  auth: {
    accessToken: String,
    refreshToken: String,
    expires: Date,
    clientId: Number,
    clientOwnerNickname: String,
  },
  isTestAccount: Boolean
}, {
  timestamps: true
})

accountSchema.methods.updateAccessToken = async function (accessToken) {
  const expires = new Date()
  expires.setSeconds(expires.getSeconds() + 21000)

  this.auth.accessToken = accessToken
  this.auth.expires = expires
  await this.save()
}

accountSchema.methods.isAuthorized = function () {
  // If we are earlier than expiration date, then it's authorized.
  return new Date() < this.auth.expires
}

accountSchema.methods.isNewAccount = function () {
  // An account is new if:
  //  > it was created in the last TIME_NEW_ACCOUNT_MILLIS time
  //  > no 'updatedAt' field, or 'updatedAt' === 'createdAt'
  if (!this.createdAt) {
    return false
  }
  const isFresh = (new Date() - this.createdAt) < TIME_NEW_ACCOUNT_MILLIS
  const wasUpdated = this.updatedAt && this.updatedAt > this.createdAt
  return isFresh && !wasUpdated
}

/**
 * Register a new user account. If it exists, updates the account info instead.
 *
 * @param {Object} profile <id, nickname, first_name, last_name, email>   - mercadolibre account profile
 * @param {Object} auth <accessToken, refreshToken>                       - mercadolibre access tokens
 * @param {string} [clientOwnerData]                                      - the current client owner
 * @param {string} [clientOwnerData.nickname]                             - the current client owner nickname
 *
 * @returns {Promise<Account>} - mongoose promise, resolves to the saved Account object.
 */
accountSchema.statics.register = async function (profile, auth, {nickname: clientOwnerNickname} = {}) {
  const {id, nickname, first_name, last_name, email} = profile
  const {accessToken, refreshToken} = auth

  const expires = new Date()
  expires.setSeconds(expires.getSeconds() + 21000)

  const account = {
    id,
    nickname,
    firstName: first_name,
    lastName: last_name,
    email,
    auth: {
      accessToken,
      refreshToken,
      expires,
      clientId: currentClientId,
      clientOwnerNickname
    }
  }

  const registered = await this.findOneAndUpdate({id}, account, {upsert: true, new: true})
  return registered
}

/**
 * Find any authorized account.
 * @param {Object} [andCriteria]  - optional: extra criteria for the Account.findOne query.
 *
 * @returns {Promise<Account|void>} - resolves to an Account instance if found, null otherwise.
 */
accountSchema.statics.findAnyAuthorized = function (andCriteria = null) {
  const anyAuthorizedCriteria = {
    'auth.expires': {$gt: new Date()},
    'auth.accessToken': {$exists: true}
  }
  const criteria = andCriteria ? {$and: [anyAuthorizedCriteria, andCriteria]} : anyAuthorizedCriteria

  return this.findOne(criteria)
}

/**
 * Find any authorized account, or that can be authorized for current application ID.
 *
 * @returns {Promise<Account|void>} - resolves to an Account instance if found, null otherwise.
 */
accountSchema.statics.findAnyAuthorizable = function () {
  return this.findOne({
    $or: [{
      'auth.expires': {$gt: new Date()},
      'auth.accessToken': {$exists: true}
    }, {
      'auth.clientId': currentClientId
    }]
  })
}

const Account = mongoose.model('Account', accountSchema)

module.exports = Account
