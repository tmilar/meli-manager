const router = require('express').Router()
const Account = require('../model/account')
const OrderService = require('../service/orders.service')
const QuestionsService = require('../service/questions.service')

const notificationHandler = {
  orders: async (account, orderId) => {
    console.log(`Order notification for ${account.nickname}.`)
    const orderService = await OrderService.build()
    const order = await orderService.fetchOneMeliOrder(account, orderId)
    if (!order) {
      throw new Error(`Order id ${orderId} not found for user '${account.nickname}', can't save.`)
    }

    await orderService.saveOrUpdateOrder(order)
  },
  orders_v2: async (account, orderId) => {
    console.log(`Order 'v2' notification for ${account.nickname}.`)
    const orderService = await OrderService.build()
    const order = await orderService.fetchOneMeliOrder(account, orderId)
    if (!order) {
      throw new Error(`Order id ${orderId} not found for user '${account.nickname}', can't save.`)
    }

    await orderService.saveOrUpdateOrder(order)
  },
  questions: async (account, questionId) => {
    const questionsService = await QuestionsService.build()
    console.log(`New question for ${account.nickname}! Question id: ${questionId}`)
    await questionsService.saveOrUpdateQuestion(account, questionId)
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
