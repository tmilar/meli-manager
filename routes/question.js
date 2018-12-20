const router = require('express').Router()
const moment = require('moment')
const Promise = require('bluebird')
const QuestionService = require('../service/questions.service')
const Account = require('../model/account')

/**
 * Post question answer by questionId and sellerId.
 */
router.post('/answer', async (req, res, next) => {
  const {questionId, sellerId, answerText} = req.body

  try {
    await QuestionService.answerQuestion(sellerId, questionId, answerText)
  } catch (error) {
    console.log(`Could not post question ${questionId} answer '${answerText}' of seller ${sellerId}.`, error)
    return next(error)
  }

  res.sendStatus(200)
})

router.get('/', async (req, res, next) => {
  const {accounts, store} = req.query

  let accountsArray
  if (accounts) {
    try {
      accountsArray = JSON.parse(accounts)
    } catch (error) {
      // Param 'accounts' is invalid JSON, split the string by ',' separator
      accountsArray = accounts.split(',')
    }
  }

  const nicknamesFilter = accountsArray ? {nickname: {$in: accountsArray}} : {}
  const shouldStore = store === 'true' || store === '1'

  let questionsResponse = []

  /// / *** questions service ***
  try {
    // 1. get accounts from DB
    const selectedAccounts = await Account.find(nicknamesFilter)

    // 2. fetch remote questions for accounts
    const meliQuestionFilters = {accounts: selectedAccounts}
    questionsResponse = await QuestionService.getQuestions(meliQuestionFilters)

    // 3. store selected questions
    if (shouldStore) {
      req.setTimeout(0) // No timeout, so client can wait for the result.
      await Promise.mapSeries(questionsResponse,
        ({account, response: {questions}}) =>
          Promise.mapSeries(questions, q => QuestionService.saveOrUpdateQuestion(account, q))
      )
    }
  } catch (error) {
    console.log('Something bad happened at /question', error)
    return next(error)
  }

  res.json(questionsResponse)
})

module.exports = router
