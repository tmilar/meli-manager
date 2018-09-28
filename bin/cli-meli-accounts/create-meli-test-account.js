const req = require('request-promise')
const Account = require('../../model/account')
const {auth: {mercadolibre: {clientId: currentClientId}}} = require('../../config')

/**
 *
 * @param {Account} devAccount - dev acc
 *
 * @return {Promise<object>} - resolves to created test account {username, password},
 *                             or rejects on API error otherwise.
 */
function requestTestAccount(devAccount) {
  const testAccountRequestOptions = {
    method: 'POST',
    uri: 'https://api.mercadolibre.com/users/test_user',
    qs: {
      access_token: devAccount.auth.accessToken
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
 * @returns {Promise<Object>} - testAccountCredentials request promise
 */
async function createMeliTestAccount() {
  // The requester account needs to be authorized in the same clientOwner Account app realm.
  const requesterAccount = await Account.findAnyAuthorized({
    'auth.clientId': currentClientId
  })

  if (!requesterAccount) {
    throw new Error('Couldn\'t find any authorized account for the current Meli Client ID.')
  }

  console.log(`Requesting test account using selected account '${requesterAccount.nickname}'...`)

  let testAccountCredentials
  try {
    testAccountCredentials = await requestTestAccount(requesterAccount)
  } catch (error) {
    const errMsg = `Error requesting test account with selected account '${requesterAccount.nickname}'`
    if (error) {
      error.message = `${errMsg}. ${error.message || error.data || error}`
    }
    throw new Error(error || errMsg)
  }
  return testAccountCredentials
}

module.exports = createMeliTestAccount
