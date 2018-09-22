#!/usr/bin/env node
const envPath = require('path').resolve(__dirname, '.env')
require('dotenv').config({path: envPath})

const program = require('commander')

program
  .version('0.1.0')
  .description('Interactive MercadoLibre user accounts CLI management.')
  .option('-u, --user <nickname>', 'Run using specified Account nickname for Meli API requests.')
  .parse(process.argv)

if (!program.user) {
  console.log('Please specify --user <nickname> option.')
  program.outputHelp()
  process.exit()
}

const db = require('../../config/db')
const Account = require('../../model/account')
const prompt = require('./prompt')

const cliLoginFlow = require('./cli-login-flow')
const createMeliTestAccount = require('./create-meli-test-account')

const devAccountNickname = program.user

async function doLoginFlow() {
  let accountTokens
  try {
    accountTokens = await cliLoginFlow.run()
  } catch (error) {
    throw new Error(`Ups, could not authenticate: ${error.message || error}`)
  }
  console.log('Logged in!')
  return accountTokens
}

async function generateTestAccount() {
  let testAccount
  try {
    testAccount = await createMeliTestAccount(devAccountNickname)
  } catch (error) {
    // TODO if error is lack of dev account, retry? suggest a different client id?
    throw new Error(`Whoops, could not create a test account: ${error.message || error.data || error}`)
  }
  console.log('Test account is: ', testAccount)
}

async function registerAccount({profile, tokens}) {
  let account
  try {
    account = await Account.register(profile, tokens)
  } catch (error) {
    throw new Error('Problem registering account: ' + (error.message || error))
  }
  const verbMsg = account.isNewAccount() ? 'Registered new' : 'Updated existing'
  console.log(`${verbMsg} ${account.isTestAccount ? 'test' : ''}account '${account.nickname}' succesfully.`)
}

const options = {
  newTestAccount: async () => {
    console.log('Creating test account...')
    try {
      await generateTestAccount()
      const loggedUser = await doLoginFlow()
      await registerAccount(loggedUser)
    } catch (error) {
      console.error(error.message || error)
      return
    }
  },
  existingAccount: async () => {
    console.log('Please log in with an existing account.')
    try {
      const loggedUser = await doLoginFlow()
      await registerAccount(loggedUser)
    } catch (error) {
      console.error(error.message || error)
      return
    }
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
