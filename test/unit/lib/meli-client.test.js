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

const fixture = {
  SAMPLE_QUESTION: {
    questionId: 6364505957,
    sellerNickname: 'TETE8780371'
  },
  NULL_QUESTION: {
    questionId: 9999999999
  }
}

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

  const sellerAccount = testAccounts.find(acc => acc.nickname === fixture.SAMPLE_QUESTION.sellerNickname)
  t.truthy(sellerAccount, `Seller account ${fixture.SAMPLE_QUESTION.sellerNickname} ` +
    `not included in selected testAccounts (${testAccounts.map(a => `'${a.nickname}'`).join(',')})`)

  // Get the question by id
  const questionResponseArr = await multiClient.getQuestion(fixture.SAMPLE_QUESTION.questionId)

  // Assert the question returned with correct seller info
  t.true(Array.isArray(questionResponseArr) && questionResponseArr.length === 1, 'Should return an array with one object')
  const questionResponse = questionResponseArr[0]
  t.true(Object.keys(questionResponse).every(key => ['account', 'response'].includes(key)), 'Response should include the account owner + the response question')
  const {account, response} = questionResponse
  t.is(response.id, fixture.SAMPLE_QUESTION.questionId,
    `Should retrieve question data of selected id ${fixture.SAMPLE_QUESTION.questionId}`)
  t.is(response.seller_id, sellerAccount.id, 'Should the question seller id match the expected seller id')
  t.is(account.id, sellerAccount.id, 'Should retrieve seller account info')
})

test('meli client getQuestion() returns error object and empty account when the question id is not found', async t => {
  const {multiClient} = t.context

  // Get the question by id
  const questionResponseArr = await multiClient.getQuestion(fixture.NULL_QUESTION.questionId)

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
  price: 15,
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

function _createQuestion(askingAccount, itemId, meliClient) {
  const questionText = 'pregunta de prueba'
  return meliClient.postQuestion(askingAccount, itemId, questionText)
}

async function _createQuestionOnTestAccount(askingAccount, respondingAccount, meliClient, t) {
  const {id: itemId} = await _getOrCreateTestActiveListing(respondingAccount, meliClient)
  t.truthy(itemId, 'Should exist or create an active listing to create the question.')
  const question = await _createQuestion(askingAccount, itemId, meliClient)
  t.truthy(question, 'Should exist a new question')
  t.is(question.status, 'UNANSWERED')
  t.is(question.item_id, itemId, 'Should exist the question in the specified item id')
  return question
}

/**
 * Delay in MS to await before requesting MeLi updated data.
 * This is needed because sometimes an update to MeLi API is not impacted immediately.
 * @type {number}
 */
const MELI_API_REFRESH_DELAY = 1800

async function _getAccountUnansweredQuestions(account, multiClient) {
  const accounts = [account]

  // Await a delay to make sure the following questions request is up-to-date
  await new Promise(resolve => setTimeout(resolve, MELI_API_REFRESH_DELAY))
  const questionsResponse = await multiClient.getQuestions({accounts, status: 'UNANSWERED'})

  const questionsUnanswered = questionsResponse
    .filter(({account: {id}}) => id === account.id)
    .map(({response}) => response.results)
    .reduce((qs, q) => qs.concat(q), [])

  return questionsUnanswered
}

async function _getOrCreateQuestionToAnswer(askingAccount, respondingAccount, multiClient, t) {
  let questions = await _getAccountUnansweredQuestions(respondingAccount, multiClient)
  if (!questions || questions.length === 0) {
    const freshQuestion = await _createQuestionOnTestAccount(askingAccount, respondingAccount, multiClient, t)
    questions = await _getAccountUnansweredQuestions(respondingAccount, multiClient)
    t.true(questions.length === 1 && questions[0].id === freshQuestion.id, 'Should return with the freshly created question')
    t.true(questions[0].text === freshQuestion.text, 'Should return with the freshly created question')
  }
  t.true(questions.length > 0, 'Should have returned at least one unanswered question')
  t.true(questions.every(({status}) => status === 'UNANSWERED'), 'Should all of the returned questions be unanswered.')
  t.true(questions.every(({seller_id}) => seller_id === respondingAccount.id), 'Should all of the questions belong to the selected respondingAccount')

  return questions[0]
}

test('meli client post question answer', async t => {
  // Preconditions
  // 1. test account with question.status === "UNANSWERED"
  const {multiClient, testAccounts} = t.context
  const meliTestAccounts = testAccounts.filter(acc => acc.isTestAccount)

  t.true(meliTestAccounts.length >= 2, 'Should use 2 different accounts to create a test question.')
  t.true(meliTestAccounts.every(acc => acc.isTestAccount), 'Should use test accounts to create a test question.')
  const [askingAccount, respondingAccount] = meliTestAccounts

  // 2. exists a test question status 'UNANSWERED' to be answered
  const questionToAnswer = await _getOrCreateQuestionToAnswer(askingAccount, respondingAccount, multiClient, t)

  t.true(questionToAnswer.status === 'UNANSWERED', 'Should all of the returned questions be unanswered.')
  t.true(questionToAnswer.seller_id === respondingAccount.id, 'Should all of the questions belong to the selected respondingAccount')

  // Actions
  // 1. reply answer
  const {id: answerQuestionId} = questionToAnswer
  const answerText = 'Respuesta de prueba'
  const response = await multiClient.postQuestionAnswer(respondingAccount, answerQuestionId, answerText)

  t.truthy(response, 'Should return a response, after postQuestionAnswer call.')
  t.is(response.id, answerQuestionId, 'Should respond with the specified question id')
  t.is(response.answer && response.answer.text, answerText, 'Should contain the answer text in the response')
  t.is(response.answer && response.answer.status, 'ACTIVE', 'Should contain the answer status as "ACTIVE"')

  // Postconditions
  // 1. existing questions status 'UNANSWERED' don't include the answered question.
  const questionsAfter = await _getAccountUnansweredQuestions(respondingAccount, multiClient)
  t.falsy(questionsAfter.find(q => q.id === answerQuestionId), 'Answered question should not come back as unanswered')

  // 2. the answered question can be retrieved with status 'ANSWERED'
  const questionAnsweredResponse = await multiClient.getQuestion(answerQuestionId)
  const {status, answer} = questionAnsweredResponse[0].response

  t.is(status, 'ANSWERED', 'Question status should be \'ANSWERED\'')
  t.truthy(answer, 'Answer body should be defined')
  t.is(answer.text, answerText, `Question answer text should match expected: ${answerText}`)
  t.is(answer.status, 'ACTIVE', 'Question answer status should be "ACTIVE"')
})
