const router = require('express').Router();
const moment = require('moment');
const Account = require('../model/account');
const OrderService = require("../service/orders.service.js");

const notificationHandler = {
    orders: async (account, orderId) => {
        console.log(`Order notification for ${account.nickname}.`, );
        let order = await OrderService.fetchOneMeliOrder(account, orderId);

        await OrderService.saveOrUpdateOrder(order);
    },
    orders_v2:  async (account, orderId) => {
        console.log(`Order 'v2' notification for ${account.nickname}.`, );
        let order = await OrderService.fetchOneMeliOrder(account, orderId);

        await OrderService.saveOrUpdateOrder(order);
    },
    questions: (account, questionId) => {
        console.log(`New question for ${account.nickname}! Not yet handled. `, questionId);
    },
    messages: (account, messageId) => {
        console.log(`New message for ${account.nickname}! Not yet handled.`, messageId);
    }
};

router.post('/', async (req, res, next) => {
    let {resource, user_id, topic} = req.body;
    let resourceId = resource.match(/\d+/)[0];

    console.log(`Received '${topic}' notification: `, req.body);

    try {
        const account = await Account.findOne({id: user_id});
        await notificationHandler[topic](account, resourceId);
    } catch(e) {
        console.log(e.message, e.stack);
        return next(e);
    }
    res.sendStatus(200);
});

module.exports = router;