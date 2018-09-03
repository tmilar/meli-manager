/* eslint-disable import/first,import/order,import/no-unassigned-import */
import test from 'ava'

// Load test env variables
const envTestPath = require('path').resolve(process.cwd(), '.env.test')
require('dotenv').config({path: envTestPath})

const MeliClient = require('../../../lib/meli-client')
const Account = require('../../../model/account')

// Mount db connection
require('../../../config/db').connect()

const testAccountUsernames = process.env.TEST_ACCOUNT_USERNAMES && process.env.TEST_ACCOUNT_USERNAMES.split(',')
const devAccountUsername = process.env.DEV_ACCOUNT_USERNAME || testAccountUsernames[0]

test.before('get dev account for testing', async t => {
  // Find main dev account
  const devAccount = await Account.findOne({nickname: devAccountUsername})

  if (!devAccount) {
    t.fail(`dev account for test (nickname '${devAccountUsername}') not found in DB`)
  }
  Object.assign(t.context, {devAccount})
})

test.before('get test accounts for multi-account support testing', async t => {
  t.true(Array.isArray(testAccountUsernames) && testAccountUsernames.length > 0, 'Should specify test account usernames.')
  const testAccounts = await Account.find({nickname: {$in: testAccountUsernames}})

  t.not(testAccounts, null, `Should retrieve accounts for testing (nicknames '${testAccountUsernames}') from DB.`)
  t.is(testAccounts.length, testAccountUsernames.length, `Should find the specified test accounts (nicknames '${testAccountUsernames}').`)
  t.deepEqual(testAccounts.map(acc => acc.nickname), testAccountUsernames)
  Object.assign(t.context, {testAccounts})
})

test.serial.before('initialize meli client with dev account', t => {
  const client = new MeliClient()
  const {devAccount} = t.context
  client.addAccount(devAccount)
  t.is(client.accounts.length, 1)
  Object.assign(t.context, {client})
})

test.serial.before('initialize meli client with multiple test accounts', t => {
  const multiClient = new MeliClient()
  const {testAccounts} = t.context
  t.true(testAccounts.length > 1, `Should specify more than 1 test account (specified: ${testAccounts.length})`)
  testAccounts.forEach(account => multiClient.addAccount(account))
  t.is(multiClient.accounts.length, testAccounts.length)
  Object.assign(t.context, {multiClient})
})

test('meli client retrieves sales orders of dev account', async t => {
  const {client, devAccount} = t.context
  const ordersResponse = await client.getOrders()
  t.not(ordersResponse, null)
  t.true(ordersResponse.length > 0)
  t.is(ordersResponse[0].account.nickname, devAccount.nickname)
  t.is(ordersResponse[0].error, undefined)
  t.true(ordersResponse[0].response.results.length > 0)
})

test('meli client retrieves sales orders of multiple test accounts', async t => {
  const {multiClient, testAccounts} = t.context
  const ordersResponse = await multiClient.getOrders()
  t.not(ordersResponse, null)
  t.true(ordersResponse.length > 0)
  for (let i = 0; i < testAccounts.length; i++) {
    const testAccount = testAccounts[i]
    const {nickname} = testAccount
    t.is(ordersResponse[i].account.nickname, nickname, )
    t.is(ordersResponse[i].error, undefined, `Should not return error on test account ${i} '${nickname}'`)
    t.true(Array.isArray(ordersResponse[i].response.results), `Should retrieve results for account ${i} '${nickname}'`)
  }
})
