#!/usr/bin/env node
require('dotenv').config({path: require('path').resolve(process.cwd(), '.env.test')})

const db = require('../config/db')

const cliLoginFlow = require('./cli-meli-accounts/cli-login-flow')
const createMeliTestAccount = require('./cli-meli-accounts/create-meli-test-account')

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

/**
 * Startup/setup main services.
 *  - db connect
 *  - cliLoginFlow startup
 *
 * @returns {Promise<void>} - exec promise
 */
async function setup() {
  await db.connect()
  await cliLoginFlow.setup()
}

/**
 * Generates a test account by using an existing dev Account access token.
 *
 * @throws error if
 *    * dev account nickname credentials are invalid
 *    * Mercadolibre API is not available
 * @returns {Promise<void>} - exec promise
 */
async function generateTestAccount() {
  const ownerAccountNickname = getUsernameParam() || devAccountUsername
  checkNicknameParam(ownerAccountNickname)

  const testAccount = await createMeliTestAccount(ownerAccountNickname)
  console.log('Created test Account: ', testAccount)
}

/**
 * Run cli login flow, and log the result. Report error otherwise.
 * @returns {Promise<void>} - flow exec promise
 */
async function runLoginFlow() {
  let accountData
  try {
    accountData = await cliLoginFlow.run()
    console.log('Logged in! Account data: ', accountData)
  } catch (error) {
    console.error('Could not complete authentication. Reason: ' + error.message)
  }
}

/**
 * Cleanup/close opened services for a graceful process exit.
 * Otherwise the process will keep running.
 *
 * @returns {Promise<void>} - exec promise
 */
async function exit() {
  await cliLoginFlow.clean()
  await db.disconnect()
}

async function main() {
  await setup()

  await generateTestAccount()
  await runLoginFlow()

  await exit()
}

(async () => {
  try {
    await main()
  } catch (error) {
    console.error('unexpected error: ', error)
    process.exitCode = 1
    process.exit()
  }
})()
