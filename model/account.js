const mongoose = require('mongoose')

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
    expires: Date
  }
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
  // An account is new if it was created in the last TIME_NEW_ACCOUNT_MILLIS time.
  if (!this.createdAt) {
    return false
  }
  return (new Date() - this.createdAt) < TIME_NEW_ACCOUNT_MILLIS
}

accountSchema.statics.register = async function (profile, auth) {
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
      expires
    }
  }

  const registered = await this.findOneAndUpdate({id}, account, {upsert: true}).exec()
  return registered
}

const Account = mongoose.model('Account', accountSchema)

module.exports = Account
