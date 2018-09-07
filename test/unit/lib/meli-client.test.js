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
  t.true(testAccountUsernames.every(nickname => testAccounts.some(acc => acc.nickname === nickname)), 'Should find all of the same specified test accounts')
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
  t.true(ordersResponse.length > 0, 'Should at least return one {account, response} orders item')
  testAccounts.forEach(({nickname}, i) => {
    t.is(ordersResponse[i].account.nickname, nickname)
    t.is(ordersResponse[i].error, undefined, `Should not return error on test account ${i} '${nickname}'`)
    t.true(Array.isArray(ordersResponse[i].response.results), `Should retrieve results for account ${i} '${nickname}'`)
  })
})

test('meli client retrieves questions of one account', async t => {
  const {client, devAccount} = t.context
  const questionsResponse = await client.getQuestions()
  t.not(questionsResponse, null)
  t.true(questionsResponse.length > 0, 'Should at least return one {account, response} questions item')
  t.is(questionsResponse[0].account.nickname, devAccount.nickname)
  t.is(questionsResponse[0].error, undefined)
  t.true(questionsResponse[0].response.results.length > 0)
})

test('meli client retrieves questions of multiple test accounts', async t => {
  const {multiClient, testAccounts} = t.context
  const questionsResponse = await multiClient.getQuestions()
  t.not(questionsResponse, null)
  t.true(questionsResponse.length > 0, 'Should at least return one {account, response} questions item')
  testAccounts.forEach(({nickname}, i) => {
    t.is(questionsResponse[i].account.nickname, nickname)
    t.is(questionsResponse[i].error, undefined, `Should not return error on test account ${i} '${nickname}'`)
    t.true(Array.isArray(questionsResponse[i].response.results), `Should retrieve results for account ${i} '${nickname}'`)
  })
})

test('meli client getQuestion() retrieves one question specified by id + its seller account', async t => {
  const {multiClient, testAccounts} = t.context
  const fixture = {
    questionId: 5757310895,
    sellerId: 33687004
  }
  const sellerAccount = testAccounts.find(acc => acc.id === fixture.sellerId)

  // Get the question by id
  const questionResponseArr = await multiClient.getQuestion(fixture.questionId)

  // Assert the question returned with correct seller info
  t.true(Array.isArray(questionResponseArr) && questionResponseArr.length === 1, 'Should return an array with one object')
  const questionResponse = questionResponseArr[0]
  t.true(Object.keys(questionResponse).every(key => ['account', 'response'].includes(key)), 'Response should include the account owner + the response question')
  const {account, response} = questionResponse
  t.is(response.id, fixture.questionId, `Should retrieve question data of selected id ${fixture.questionId}`)
  t.is(response.seller_id, sellerAccount.id, 'Should the question seller id match the expected seller id')
  t.is(account.id, sellerAccount.id, 'Should retrieve seller account info')
})
