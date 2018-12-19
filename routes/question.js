const router = require('express').Router()
const QuestionService = require('../service/questions.service')

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

module.exports = router
