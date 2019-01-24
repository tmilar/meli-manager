const router = require('express').Router()
const Account = require('../model/account')
const OrderService = require('../service/orders.service.js')
const QuestionsService = require('../service/questions.service.js')

const notificationHandler = {
  orders: async (account, orderId) => {
    console.log(`Order notification for ${account.nickname}.`)
    const order = await OrderService.fetchOneMeliOrder(account, orderId)

    await OrderService.saveOrUpdateOrder(order)
  },
  orders_v2: async (account, orderId) => {
    console.log(`Order 'v2' notification for ${account.nickname}.`)
    const order = await OrderService.fetchOneMeliOrder(account, orderId)

    await OrderService.saveOrUpdateOrder(order)
  },
  questions: async (account, questionId) => {
    console.log(`New question for ${account.nickname}! Question id: ${questionId}`)
    await QuestionsService.saveOrUpdateQuestion(account, questionId)
  },
  messages: async (account, messageId) => {
    console.log(`New message for ${account.nickname}! Not yet handled.`, messageId)
  },
  items: async (account, itemId) => {
    console.log(`'Items' notification for ${account.nickname}! Not yet handled.`, itemId)
  }
}

router.post('/', async (req, res, next) => {
  const {resource, user_id: userId, topic} = req.body
  const resourceId = resource.match(/(MLA)?\d+/)[0]

  console.log(`Received '${topic}' notification:`, req.body)

  try {
    const account = await Account.findOne({id: userId})
    if (!account) {
      const errMsg = `Notification can't be handled: user id ${userId} is not registered in DB. `
      return next(errMsg)
    }

    const handler = notificationHandler[topic]
    if (typeof handler === 'function') {
      await handler(account, resourceId)
    } else {
      console.log(`Notification topic '${topic}' not yet handled.`)
    }
  } catch (error) {
    console.log(error.message, error.stack)
    return next(error)
  }

  res.sendStatus(200)
})

module.exports = router
