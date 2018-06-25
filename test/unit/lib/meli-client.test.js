/* eslint-disable import/first,import/order,import/no-unassigned-import */
import test from 'ava'

// Load test env variables
const envTestPath = require('path').resolve(process.cwd(), '.env.test')
require('dotenv').config({path: envTestPath})

const MeliClient = require('../../../lib/meli-client')
const Account = require('../../../model/account')

// Mount db connection
require('../../../config/db')

const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME
let devAccount
let client

test.before('get dev account for testing', async t => {
  // Find main dev account
  devAccount = await Account.findOne({nickname: devAccountUsername})

  if (!devAccount) {
    t.fail(`dev account for test (nickname '${devAccountUsername}') not found in DB`)
  }
})

test.serial.before('initialize meli client with dev account', async t => {
  client = new MeliClient()
  client.addAccount(devAccount)
  t.is(client.accounts.length, 1)
})

test('meli client retrieves sales orders of dev account', async t => {
  const ordersResponse = await client.getOrders()
  t.not(ordersResponse, null)
  t.true(ordersResponse.length > 0)
  t.is(ordersResponse[0].account.nickname, devAccountUsername)
  t.is(ordersResponse[0].error, undefined)
  t.true(ordersResponse[0].response.results.length > 0)
})
