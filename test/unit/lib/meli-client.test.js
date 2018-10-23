/* eslint-disable import/first,import/order,import/no-unassigned-import,camelcase */
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

test.serial.before('ensure meli client test accounts are authorized', async t => {
  const {client, multiClient} = t.context
  const orders = await client.getOrders()
  const multiOrders = await multiClient.getOrders()
  t.true(Array.isArray(orders), 'should have responded with orders array')
  t.true(Array.isArray(multiOrders), 'should have responded with orders array')
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
    sellerNickname: 'POKEVENTAS_JUSIMIL'
  }
  const sellerAccount = testAccounts.find(acc => acc.nickname === fixture.sellerNickname)
  t.truthy(sellerAccount, `Seller account ${fixture.sellerNickname} ` +
    `not included in selected testAccounts (${testAccounts.map(a => `'${a.nickname}'`).join(',')})`)

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

test('meli client getQuestion() returns error object and empty account when the question id is not found', async t => {
  const {multiClient} = t.context
  const fixture = {
    questionId: 9999999999999
  }

  // Get the question by id
  const questionResponseArr = await multiClient.getQuestion(fixture.questionId)

  // Assert the question not returned with no seller info
  t.true(Array.isArray(questionResponseArr) && questionResponseArr.length === 1, 'Should return an array with one object')
  const questionResponse = questionResponseArr[0]
  t.true(Object.keys(questionResponse).every(key => ['account', 'response'].includes(key)), 'Response should include the account owner + the response question')
  const {account, response} = questionResponse
  t.truthy(response.message, 'Should return a response with an error message')
  t.is(response.status, 404, 'Should return a response with error status 404 not found')
  t.deepEqual(account, {}, 'Should retrieve no account seller info')
})

const testItemJson = {
  title: 'Item de test - No Ofertar',
  category_id: 'MLA3530', // 'OTHERS' category
  price: 10,
  currency_id: 'ARS',
  available_quantity: 1,
  buying_mode: 'buy_it_now',
  listing_type_id: 'bronze',
  condition: 'new',
  description: {
    plain_text: 'Item: Ray-Ban WAYFARER Gloss Black RB2140 901  Model: RB2140. Size: 50mm. Name: WAYFARER. Color: Gloss Black. Includes Ray-Ban Carrying Case and Cleaning Cloth. New in Box'
  },
  warranty: '12 months by Ray Ban',
  pictures: [
    {source: 'http://upload.wikimedia.org/wikipedia/commons/f/fd/Ray_Ban_Original_Wayfarer.jpg'},
    {source: 'http://en.wikipedia.org/wiki/File:Teashades.gif'}
  ]
}

async function _getOrCreateTestActiveListing(account, meliClient) {
  const listings = await meliClient.getListings(account)
  const activeListings = listings.filter(l => l.status === 'active')
  if (activeListings && activeListings.length > 0) {
    return activeListings[0]
  }
  return meliClient.createListing(account, testItemJson)
}

test.failing('meli client post question answer', async t => {
  // Preconditions
  // 1. test account with question.status === "UNANSWERED"
  const {multiClient/* , testAccounts */} = t.context
  const account = null /* TestAccounts.filter(acc => acc.nickname.indexOf('TETE') > -1)[0] */
  const questionsResponse = await multiClient.getQuestions({account, status: 'UNANSWERED'})
  const questions = questionsResponse
    .map(({response}) => response.results)
    .reduce((qs, q) => qs.concat(q), [])

  t.true(questions.length > 0, 'Should have returned at least one unanswered question')
  t.true(questions.every(({status}) => status === 'UNANSWERED'), 'Should all of the returned questions be unanswered.')

  // Actions
  // 1. reply answer
  const questionToAnswer = questions[0]
  const {id} = questionToAnswer
  const answerText = 'Respuesta de prueba'
  const response = await multiClient.postQuestionAnswer(id, answerText)
  t.is(response.status, 200, 'Should respond status 200 OK, after postQuestionAnswer call.')

  // Postconditions
  // 1. question answered is excluded from 'UNANSWERED' questions
  const questionsResponseAfter = await multiClient.getQuestions({account, status: 'UNANSWERED'})
  const questionsAfter = questionsResponseAfter
    .map(({response}) => response.results)
    .reduce((qs, q) => qs.concat(q), [])
  t.false(questionsAfter.find(q => q.id === id), 'Answered question should not come back as unanswered')

  // 2. selected question appears as answered
  const questionAnsweredResponse = await multiClient.getQuestion(id)
  const {status, answer} = questionAnsweredResponse[0].response
  t.is(status, 'ANSWERED', 'Question status should be \'ANSWERED\'')
  t.truthy(answer, 'Answer body should be defined')
  t.is(answer.text, answerText, `Question answer text should match expected: ${answerText}`)
})
