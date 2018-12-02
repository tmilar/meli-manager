#!/usr/bin/env node
const envPath = require('path').resolve(__dirname, '.env')
require('dotenv').config({path: envPath})
const chalk = require('chalk')
const program = require('commander')
const Promise = require('bluebird')

program
  .version('0.1.0')
  .description('Interactive CLI for MercadoLibre user Accounts management.')
  .parse(process.argv)

let clientOwnerData = null

const db = require('../../config/db')
const Account = require('../../model/account')
const prompt = require('./prompt')

const cliLoginFlow = require('./cli-login-flow')
const createMeliTestAccount = require('./create-meli-test-account')
const getOwnerAccount = require('./get-owner-account')

async function doLoginFlow() {
  let accountData
  try {
    accountData = await cliLoginFlow.run()
  } catch (error) {
    throw new Error(`Could not complete authentication. Reason: ${error.message || error}`)
  }
  return accountData
}

async function generateTestAccount() {
  let testAccount
  try {
    testAccount = await createMeliTestAccount()
  } catch (error) {
    throw new Error(`Could not create a test account: ${error.message || error.data || error}`)
  }
  return testAccount
}

/**
 *
 *
 * @param {Object} loggedUser             - the mercadolibre logged user info
 * @param {Object} loggedUser.profile     - mercadolibre account profile info
 * @param {Object} loggedUser.tokens.<accessToken, refreshToken>
 *                                        - mercadolibre account tokens
 * @param {Object} testAccountCredentials          - the mercadolibre test account data
 * @param {string} testAccountCredentials.nickname - test account nickname
 * @param {string} testAccountCredentials.password - test account generated password
 *
 * @returns {Promise<Account>} - resolves to the registered Account
 */
async function registerTestAccount({profile, tokens}, testAccountCredentials) {
  let account
  try {
    account = await Account.registerTestUser(profile, tokens, clientOwnerData, testAccountCredentials)
  } catch (error) {
    throw new Error('Problem registering test account: ' + (error.message || error))
  }
  const verbMsg = account.isNewAccount() ? 'Registered new' : 'Updated existing'
  console.log(chalk.green(`${verbMsg} ${account.isTestAccount ? 'TEST ' : ''}account '${chalk.bold.green(account.nickname)}' succesfully.`))

  return account
}

/**
 *
 * @param {Object} loggedUser             - the mercadolibre logged user info
 * @param {Object} loggedUser.profile     - mercadolibre account profile info
 * @param {Object} loggedUser.tokens.<accessToken, refreshToken>
 *                                        - mercadolibre account tokens
 *
 * @returns {Promise<void>} - exec promise
 */
async function registerAccount({profile, tokens}) {
  let account
  try {
    account = await Account.register(profile, tokens, clientOwnerData)
  } catch (error) {
    throw new Error('Problem registering account: ' + (error.message || error))
  }
  const verbMsg = account.isNewAccount() ? 'Registered new' : 'Updated existing'
  console.log(chalk.green(`${verbMsg} ${account.isTestAccount ? 'TEST ' : ''}account '${chalk.bold.green(account.nickname)}' succesfully.`))
}

async function tryEnsureExpectedLogin(loggedUser, expectedNickname) {
  while (loggedUser.profile.nickname !== expectedNickname) {
    console.log(chalk.red(`Error: must log in with the created test user '${expectedNickname}'`))
    loggedUser = await doLoginFlow()
  }
  return loggedUser
}

/**
 * Display selected meli accounts nicknames.
 *
 * @param {Array<Account>} accounts   - the accounts to display
 */
function diplayAccountsList(accounts) {
  if(!accounts || !accounts.length) {
    console.log(chalk.red('No accounts available for the current clientId.'))
    return
  }
  console.log("Available accounts are: ")
  const accountsList = accounts.map(acc => acc.nickname).join("\n")
  console.log(chalk.magenta(accountsList))
}

const options = {
  newTestAccount: async () => {
    console.log('Creating test account...')
    try {
      const {nickname, password} = await generateTestAccount()
      console.log('Success! Please log in now with the created test account:',
        chalk.bold.yellow(`{ nickname: '${nickname}', password: '${password}' }`))
      let loggedUser = await doLoginFlow()
      loggedUser = await tryEnsureExpectedLogin(loggedUser, nickname)
      await registerTestAccount(loggedUser, {nickname, password})
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
  firstUserLogin: async () => {
    // This is the First login ever -> do login & register -> retrieve clientOwner application + account
    console.log('To get started, please log in with an existing account.')
    try {
      const loggedUser = await doLoginFlow()
      await retrieveAndDisplayApplicationOwnerData(loggedUser)
      await registerAccount(loggedUser)
    } catch (error) {
      console.error(chalk.red(error.message || error))
    }
  },
  listAccounts: async () => {
    try {
      const accounts = await Account.findAllByCurrentClientId()
      diplayAccountsList(accounts)
    } catch (error) {
      console.error(chalk.red(error.message || error))
    }
  },
  exit: () => {
    console.log(chalk.bold.green('Bye!'))
  }
}

async function checkIsLoginRequired() {
  return !clientOwnerData || !(await Account.findAnyAuthorized()) || !(await Account.countDocuments())
}

/**
 * Check if is a first time usage.
 * @returns {Promise<boolean>} - resolves true if no existing accounts
 */
async function checkIsFirstTimeUsage() {
  return !(await Account.countDocuments())
}

/**
 * Find the current clientOwner user data and store it locally.
 *
 * This is needed to properly create and maintain test accounts,
 * and useful to register and refresh regular accounts as well.
 *
 * @returns {Promise<void>} - exec promise
 * @throws error if couldn't fetch owner account/application data.
 */
async function retrieveAndDisplayApplicationOwnerData({tokens: {accessToken}} = {tokens: {}}) {
  let ownerAccount
  try {
    ownerAccount = await getOwnerAccount(accessToken)
  } catch (error) {
    const errMsgReason = error.message || error.data || error || ''
    const errMsg = `Could not retrieve client owner account data.${` ${errMsgReason}\n`}`
      + `Please make sure the saved accounts data is valid and try again. `
    throw new Error(errMsg)
  }
  // Response: set to clientOwnerData
  clientOwnerData = ownerAccount.clientOwnerData

  // Log connected application info
  const {applicationData: {name, short_name: shortName}} = ownerAccount
  console.log(chalk.gray(`Using client owner ${chalk.blueBright(clientOwnerData.nickname)}` +
    ` MercadoLibre Application '${chalk.cyanBright(name)}' (short name: '${shortName}')`))
}

async function welcomeFlow() {
  const isFirstTimeUser = await checkIsFirstTimeUsage()
  if (isFirstTimeUser) {
    console.log(chalk.cyan('Welcome!'))
    console.log(chalk.bold.gray('This command-line tool will help you manage your MercadoLibre accounts. ' +
      'Create and store MercadoLibre Test accounts, manage existing ones, and more!'))
    return
  }
  console.log(chalk.cyan('Welcome back!'))
  try {
    await retrieveAndDisplayApplicationOwnerData()
  } catch (error) {
    const errMsg = error.message || error.data || error || ''
    if(errMsg.length > 0) {
      console.log(errMsg)
    }
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
  await welcomeFlow()

  let choice
  do {
    const isDbConnected = await db.isConnected()
    const isLoginRequired = await checkIsLoginRequired()
    choice = await prompt({isDbConnected, isLoginRequired})
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
