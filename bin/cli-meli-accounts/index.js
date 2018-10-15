#!/usr/bin/env node
const envPath = require('path').resolve(__dirname, '.env')
require('dotenv').config({path: envPath})
const chalk = require('chalk')
const program = require('commander')
const Promise = require('bluebird')

program
  .version('0.1.0')
  .description('Interactive CLI for MercadoLibre user Accounts management.')
  .option('-u, --user <nickname>', 'Run using specified nickname Account keys for MeLi API requests.')
  .parse(process.argv)

if (!program.user) {
  console.error(chalk.yellow(`Please specify ${chalk.bold('-u|--user <nickname>')} option.`))
  program.outputHelp()
  process.exit()
}

const devAccountNickname = program.user

const db = require('../../config/db')
const Account = require('../../model/account')
const prompt = require('./prompt')

const cliLoginFlow = require('./cli-login-flow')
const createMeliTestAccount = require('./create-meli-test-account')

async function doLoginFlow() {
  let accountTokens
  try {
    accountTokens = await cliLoginFlow.run()
  } catch (error) {
    throw new Error(`Could not complete authentication. Reason: ${error.message || error}`)
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
  console.log(chalk.green(`${verbMsg} ${account.isTestAccount ? 'test' : ''}account '${chalk.bold.green(account.nickname)}' succesfully.`))
}

const options = {
  newTestAccount: async () => {
    console.log('Creating test account...')
    try {
      await generateTestAccount()
      const loggedUser = await doLoginFlow()
      await registerAccount(loggedUser)
    } catch (error) {
      console.error(chalk.red(error.message || error))
    }
  },
  existingAccount: async () => {
    console.log('Please log in with an existing account.')
    try {
      const loggedUser = await doLoginFlow()
      await registerAccount(loggedUser)
    } catch (error) {
      console.error(chalk.red(error.message || error))
    }
  },
  exit: () => {
    console.log(chalk.bold.green('Bye!'))
  }
}

/**
 * Initialize needed services.
 *
 * @returns {Promise<void>} - exec promise
 */
function setup() {
  return Promise.all([db.connect(), cliLoginFlow.setup()])
}

/**
 * Cleanup/close opened services for a graceful process exit.
 * Otherwise, the process will keep running.
 *
 * @returns {Promise<void>} - exec promise
 */
function exit() {
  return Promise.all([db.disconnect(), cliLoginFlow.clean()])
}

async function main() {
  await setup()
  console.log(chalk.cyan('Welcome!'))

  let choice
  do {
    choice = await prompt()
    const selectedAction = options[choice.action]
    if (!selectedAction) {
      console.error(chalk.bold.red(`Selected option is not valid: ${chalk.red(JSON.stringify(choice))}`))
      continue
    }
    await selectedAction()
  } while (choice.action !== 'exit')

  await exit()
}

main()
  .catch(error => {
    console.error(chalk.bold.red('unexpected error: '), error)
    process.exit(1)
  })
