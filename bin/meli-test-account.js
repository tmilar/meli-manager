#!/usr/bin/env node
require('dotenv').config({path: require('path').resolve(process.cwd(), '.env.test')})

const app = require('express')()
const req = require('request-promise')
const chromeLauncher = require('chrome-launcher')
const {Spinner} = require('cli-spinner')
const db = require('../config/db')

const auth = require('../routes/auth')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME
const port = process.env.PORT
const TIMEOUT_MS = 60 * 1000

const state = {
  spinner: null
}

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

function onAuthSuccess() {
  state.spinner.stop(true)
  console.log('Test account Register success! Exiting...')
  process.exit()
}

function onAuthAbort() {
  state.spinner.stop(true)
  console.log('User aborted login (Chrome window closed).')
  process.exit()
}

async function launchChrome(loginUrl) {
  console.log(`Waiting for login on: ${loginUrl}`)
  const chrome = await chromeLauncher.launch({
    startingUrl: loginUrl
  })
  chrome.process.once('exit', onAuthAbort)
  console.log(`Chrome window opened.`)
  return chrome
}

function startWaitLoginSpinner() {
  const dateStart = new Date()
  const dateEnd = dateStart.getTime() + TIMEOUT_MS
  const spinner = new Spinner({
    text: `%s `,
    stream: process.stderr,
    onTick(msg) {
      const now = new Date()
      const millisLeft = dateEnd - now.getTime()
      const secondsLeft = Math.max(Math.ceil(millisLeft / 1000), 0)
      const timeLeftMsg = `Waiting login... ${secondsLeft} seconds left ${millisLeft <= 0 ? '\n' : ''}`
      this.clearLine(this.stream)
      this.stream.write(msg + timeLeftMsg)
      if (millisLeft <= 0) {
        spinner.stop()
      }
    }
  })
  spinner.setSpinnerString(19)
  spinner.start()
  return spinner
}

async function promptOauthLogin(server) {
  const {address} = server.address()
  const hostname = ['::', '127.0.0.1', 'localhost'].includes(address) ? 'localhost' : address
  const loginUrl = `http://${hostname}:${port}/auth/mercadolibre`
  const chrome = await launchChrome(loginUrl)
  state.spinner = startWaitLoginSpinner()

  setTimeout(() => {
    console.log('Timeout.')
    chrome.kill()
    process.exit()
  }, TIMEOUT_MS)
}

function setupOAuthRouter(app) {
  // Setup default MercadoLibre oauth routes
  app.use('/auth', auth)
  // Override auth success behavior
  app.use('/auth/success', onAuthSuccess)
}

function cliLoginFlow() {
  setupOAuthRouter(app)

  // Start express server
  const server = app.listen(port, () => promptOauthLogin(server))
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
  await generateTestAccount()
  cliLoginFlow()
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
