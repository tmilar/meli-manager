const req = require('request-promise')
const Account = require('../../model/account')
const {auth: {mercadolibre: {clientId: currentClientId}}} = require('../../config')

/**
 *
 * @param {Account} authorizedAccount                                - account with valid access_token for the request
 *
 * @return {Promise<{nickname: string, password: string, _}>} - resolves to created test account
 * @throws on Mercadolibre API error response.
 */
function requestTestAccount(authorizedAccount) {
  const testAccountRequestOptions = {
    method: 'POST',
    uri: 'https://api.mercadolibre.com/users/test_user',
    qs: {
      access_token: authorizedAccount.auth.accessToken
    },
    body: {
      site_id: 'MLA'
    },
    json: true // Automatically stringifies the body to JSON
  }
  return req(testAccountRequestOptions)
}

/**
 * Create a MercadoLibre test account issuing a POST request to MercadoLibre API.
 * Resolves to created account credentials {nickname, password}
 *
 * @throws error if:
 *         - owner account nickname not found
 *         - account is unauthorized or other failure when contacting MercadoLibre API
 *         - test accounts creation quota exceeded for the MeLi App client ID (currently, maximum is 10 accounts).
 * @returns {Promise<{nickname: string, password: string}>} - testAccountCredentials request promise
 */
async function createMeliTestAccount() {
  // The requester account needs to be authorized in the same clientOwner Account app realm.
  const requesterAccount = await Account.findAnyAuthorized({
    'auth.clientId': currentClientId
  })

  if (!requesterAccount) {
    // there might be accounts, but none authorized.
    const errMsg = 'to create a new Test account, we need to use any authorized Account in the current Meli Client ID realm, ' +
      'but none was found. Please Login & Register again first. '
    throw new Error(errMsg)
  }

  let testAccountCredentials
  try {
    testAccountCredentials = await requestTestAccount(requesterAccount)
  } catch (error) {
    const errMsg = 'Error requesting test account'
    if (error) {
      const maximumTestAccountsError = error && error.statusCode && error.statusCode === 403
      if (maximumTestAccountsError) {
        error.message = `${errMsg}. Maximum of 10 created accounts reached for the client owner '${requesterAccount.auth.clientOwnerNickname}'. ` +
          'Please try again using a different client owner.'
      } else {
        error.message = `${errMsg}. ${error.message || error.data || error}`
      }
    }
    throw new Error(error.message || error || errMsg)
  }
  return testAccountCredentials
}

module.exports = createMeliTestAccount
