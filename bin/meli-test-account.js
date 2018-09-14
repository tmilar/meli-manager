#!/usr/bin/env node
require('dotenv').config({path: require('path').resolve(process.cwd(), '.env.test')})

const req = require('request-promise')
const db = require('../config/db')

const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')
const cliLoginFlow = require('./cli-meli-accounts/cli-login-flow')

const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME

/**
 * Parse MeLi dev account Username (AKA 'nickname') from command line.
 * Defined as: '--user=VALUE' or '-u=VALUE'
 *
 * @returns {string | null} - username string if valid input, null otherwise.
 */
function getUsernameParam() {
  const args = process.argv.slice(2)
  const regExpUserParameter = /^-(-user|u)=((?!\s*$).+)/
  const userParameterString = args.find(arg => regExpUserParameter.test(arg))
  const userParameterValue = userParameterString && userParameterString.match(regExpUserParameter)[2].trim()
  return userParameterValue || null
}

function checkNicknameParam(nickname) {
  if (!nickname || !(typeof nickname === 'string') || nickname.trim().length === 0) {
    throw new Error('Must define dev account username. ' +
      'Usage: --user=USERNAME or -u=USERNAME . ' +
      'Can also be defined specifying env var DEV_ACCOUNT_USERMAME.')
  }
}

async function getDevAccount() {
  const nickname = getUsernameParam() || devAccountUsername
  checkNicknameParam(nickname)
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

async function requestTestAccount(devAccount) {
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

async function createMeliTestAccount(devAccount) {
  let response
  try {
    response = await requestTestAccount(devAccount)
  } catch (e) {
    let errMsg = `Error requesting test account with dev account '${devAccount.nickname}'`
    if (e) {
      e.message = `${errMsg}. ${e.message}`
    }
    throw new Error(e || errMsg)
  }
  return response
}

async function generateTestAccount() {
  const ownerAccount = await getDevAccount()
  console.log(`Requesting test account using dev account '${ownerAccount.nickname}'...`)
  let testAccount = await createMeliTestAccount(ownerAccount)
  console.log('Created test Account: ', testAccount)
}

async function main() {
  await db.connect()
  await cliLoginFlow.setup()

  await generateTestAccount()
  const accountData = await cliLoginFlow.run()
  console.log('Logged in! Account data: ', accountData)
}

(async () => {
  try {
    await main()
  } catch (e) {
    console.error('unexpected error: ', e)
    process.exitCode = 1
    process.exit()
  }
})()
