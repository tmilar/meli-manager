const mongoose = require('mongoose')

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
})

// accountSchema.methods.refreshAccessToken = async function () {
//   const requestNewAccessToken = Promise.promisify(refresh.requestNewAccessToken)
//   const accessToken = await requestNewAccessToken('mercadolibre', this.auth.refreshToken)
//
//   await this.updateAccessToken(accessToken)
// }

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

/**
 * @deprecated
 * @returns {Promise<T | never>}
 */
accountSchema.methods.checkAccessToken = async function () {
  if (this.isAuthorized()) {
    return
  }
  console.log(`Token for ${this.nickname} expired. Refreshing...`)
  return this.refreshToken()
    .then(() => console.log(`Refresh token success for ${this.nickname}`))
    .catch(e => {
      if (e.data) {
        e.message = `Could not refresh token for ${this.nickname}.`
      }
      throw e
    })
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

  await this.findOneAndUpdate({id}, account, {upsert: true}).exec()

  console.log(`Login & save ${nickname} account auth successful!`)
}

const Account = mongoose.model('Account', accountSchema)

module.exports = Account
