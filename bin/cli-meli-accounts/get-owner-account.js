const req = require('request-promise')

const {refresh} = require('../../config/meli-auth')
const Account = require('../../model/account')
const {auth: {mercadolibre: {clientId}}} = require('../../config')

/**
 * Get current MercadoLibre Application Client owner Account info.
 *
 * @returns {Promise<{applicationData: *, clientOwnerData: *}>} - resolves to Application + Owner User data
 * @throws if:
 *  - no authoriz-able Account could be retrieved from DB
 *  - Meli API request failure
 */
async function getOwnerAccount() {
  // 1. get <any> valid (OR retrievable) access_token from any registered account in DB
  const account = await Account.findAnyAuthorizable()

  // 2. if none, fail.
  if (!account) {
    throw new Error('No authorized account found.')
  }

  if (!account.isAuthorized()) {
    const accessToken = await refresh.requestNewAccessToken('mercadolibre', account.auth.refreshToken)
    await account.updateAccessToken(accessToken)
  }

  const {accessToken} = account.auth

  // 3. request application data: GET /applications/:clientId
  let applicationData
  try {
    applicationData = await req({
      method: 'GET',
      uri: `https://api.mercadolibre.com/applications/${clientId}`,
      qs: {
        access_token: accessToken
      },
      json: true
    })
  } catch (error) {
    throw new Error(`Could not GET application data for clientId '${clientId}'. Reason: ${error.message || error.data || error}`)
  }

  // 4. response: extract {owner_id}
  const {owner_id: ownerId} = applicationData

  // 5. request owner user data: GET /users/:owner_id
  let clientOwnerData
  try {
    clientOwnerData = await req({
      method: 'GET',
      uri: `https://api.mercadolibre.com/users/${ownerId}`,
      qs: {
        access_token: accessToken
      },
      json: true
    })
  } catch (error) {
    throw new Error(`Could not GET user data for id: '${ownerId}'. Reason: ${error.message || error.data || error}`)
  }

  return {applicationData, clientOwnerData}
}

module.exports = getOwnerAccount
