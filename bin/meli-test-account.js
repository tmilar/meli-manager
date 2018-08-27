#!/usr/bin/env node
require('dotenv').config({path: require('path').resolve(process.cwd(), '.env.test')})
require('../config/db').connect()

const app = require('express')()
const req = require('request-promise')
const chromeLauncher = require('chrome-launcher')
const auth = require('../routes/auth')
const Account = require('../model/account')
const {refresh} = require('../config/meli-auth')

const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME
const port = process.env.PORT
const TIMEOUT_MS = 60 * 1000

async function getDevAccount() {
  const account = await Account.findOne({nickname: devAccountUsername})
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
  console.log('Test account Register success! Exiting...')
  process.exit()
}

async function launchChrome(loginUrl) {
  console.log(`Waiting for login on: ${loginUrl}`)
  await chromeLauncher.launch({
    startingUrl: loginUrl
  })
  console.log(`Chrome window opened.`)
}

async function onListen(server) {
  const {address} = server.address()
  const hostname = ['::', '127.0.0.1', 'localhost'].includes(address) ? 'localhost' : address
  const loginUrl = `http://${hostname}:${port}/auth/mercadolibre`
  await launchChrome(loginUrl)
  console.log(`${Math.round(TIMEOUT_MS / 1000)} seconds left...`)
  setTimeout(() => {
    console.log('Timeout.')
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
    return console.error(`Error requesting test account with dev account '${devAccount.nickname}'`, e)
  }
  console.log('Test account: ', response)
  setupAuthRouter()
}

(async () => {
  try {
    await main()
  } catch (e) {
    console.error('unexpected error: ', e)
    process.exit()
  }
})()
