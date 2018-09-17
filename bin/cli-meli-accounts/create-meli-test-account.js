const req = require('request-promise')
const {refresh} = require('../../config/meli-auth')
const Account = require('../../model/account')

async function getDevAccount({nickname}) {
  const account = await Account.findOne({nickname})
  if (!account) {
    throw new Error(`Dev Account username '${nickname}' not found in db.`)
  }
  if (!account.isAuthorized()) {
    const accessToken = await refresh.requestNewAccessToken('mercadolibre', account.auth.refreshToken)
    await account.updateAccessToken(accessToken)
  }
  return account
}

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

async function createMeliTestAccount(nickname) {
  if (!nickname || nickname.length === 0) {
    // TODO instead of throwing, just fetch any valid/authorized account -> if none, ask first a new user login/register.
    throw new Error('The owner account nickname is required to request a MeLi Test Account!')
  }

  const ownerAccount = await getDevAccount({nickname})
  console.log(`Requesting test account using dev account '${ownerAccount.nickname}'...`)

  let response
  try {
    response = await requestTestAccount(ownerAccount)
  } catch (error) {
    const errMsg = `Error requesting test account with dev account '${ownerAccount.nickname}'`
    if (error) {
      error.message = `${errMsg}. ${error.message || error}`
    }
    throw new Error(error || errMsg)
  }
  return response
}

module.exports = createMeliTestAccount
