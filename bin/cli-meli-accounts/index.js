#!/usr/bin/env node
const envPath = require('path').resolve(__dirname, '.env')
require('dotenv').config({path: envPath})

const db = require('../../config/db')
const prompt = require('./prompt')

const cliLoginFlow = require('./cli-login-flow')
const createMeliTestAccount = require('./create-meli-test-account')

const devAccountNickname = 'POKEVENTAS_JUSIMIL' // TODO retrieve from command-line args instead of hardcoding

async function doLoginFlow() {
  let accountTokens
  try {
    accountTokens = await cliLoginFlow.run()
  } catch (error) {
    console.error('Ups, could not login:', error.message)
    return
  }
  console.log('Logged in!')
  console.log('[Mock registering] Tokens: ', accountTokens)
}

async function generateTestAccount() {
  let testAccount
  try {
    testAccount = await createMeliTestAccount(devAccountNickname)
  } catch (error) {
    // TODO if error is lack of dev account, retry? suggest a different client id?
    console.error('Whoops, could not create a test account:', error.message)
    return
  }
  console.log('Test account is: ', testAccount)
}

const options = {
  newTestAccount: async () => {
    console.log('Creating test account...')
    await generateTestAccount()
    await doLoginFlow()
    console.log('Done.')
  },
  existingAccount: async () => {
    console.log('Please log in with an existing account.')
    await doLoginFlow()
    console.log('Done.')
  },
  exit: () => {
    console.log('Bye!')
  }
}

/**
 * Initialize needed services.
 *
 * @returns {Promise<void>} - exec promise
 */
async function setup() {
  await db.connect()
  await cliLoginFlow.setup()
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
  console.log('Welcome!')

  let choice
  do {
    choice = await prompt()
    const selectedAction = options[choice.action]
    if (!selectedAction) {
      console.error(`Selected option is not valid: ${JSON.stringify(choice)}`)
      continue
    }
    await selectedAction()
  } while (choice.action !== 'exit')

  await exit()
}

main()
