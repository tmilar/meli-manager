#!/usr/bin/env node
require('dotenv').config({path: require('path').resolve(process.cwd(), '.env.test')})
require('../config/db').connect()

const app = require('express')()
const req = require('request-promise')
const chromeLauncher = require('chrome-launcher')
const {Spinner} = require('cli-spinner')

const auth = require('../routes/auth')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME
const port = process.env.PORT
const TIMEOUT_MS = 60 * 1000

const global = {
  spinner: null
}

async function getDevAccount() {
  const account = await Account.findOne({nickname: devAccountUsername})
  if (!account) {
    throw new Error(`Dev Account username ${devAccountUsername} not found.`)
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
  global.spinner.stop(true)
  console.log('Test account Register success! Exiting...')
  process.exit()
}

function onAuthAbort() {
  global.spinner.stop(true)
  console.log('Chrome login window closed.')
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
  const dateEnd = new Date(dateStart.getTime() + TIMEOUT_MS)
  const spinner = new Spinner({
    text: `%s `,
    stream: process.stderr,
    onTick(msg) {
      const now = new Date()
      const millisLeft = dateEnd.getTime() - now.getTime()
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

async function onListen(server) {
  const {address} = server.address()
  const hostname = ['::', '127.0.0.1', 'localhost'].includes(address) ? 'localhost' : address
  const loginUrl = `http://${hostname}:${port}/auth/mercadolibre`
  const chrome = await launchChrome(loginUrl)
  global.spinner = startWaitLoginSpinner()

  setTimeout(() => {
    console.log('Timeout.')
    chrome.kill()
    process.exit()
  }, TIMEOUT_MS)
}

function setupAuthRouter() {
  // Setup default MercadoLibre oauth routes
  app.use('/auth', auth)
  // Override auth success behavior
  app.use('/auth/success', onAuthSuccess)

  // Start express server
  const server = app.listen(port, async () => {
    await onListen(server)
  })
}

async function main() {
  const devAccount = await getDevAccount()
  console.log(`Requesting test account using dev account '${devAccount.nickname}'...`)
  let response
  try {
    response = await requestTestAccount(devAccount)
  } catch (e) {
    let errMsg = `Error requesting test account with dev account '${devAccount.nickname}'`
    if (e.message) {
      errMsg += `. ${e.message}`
    }
    console.error(errMsg)
    process.exitCode = 1
    return process.exit()
  }
  console.log('Test account: ', response)
  setupAuthRouter()
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
