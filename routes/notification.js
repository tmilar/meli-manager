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
    questions: async (account, questionId) => {
        console.log(`New question for ${account.nickname}! Not yet handled. `, questionId);
    },
    messages: async (account, messageId) => {
        console.log(`New message for ${account.nickname}! Not yet handled.`, messageId);
    },
    items: async (account, itemId) => {
        console.log(`'Items' notification for ${account.nickname}! Not yet handled.`, itemId);
    }
};

router.post('/', async (req, res, next) => {
    let {resource, user_id, topic} = req.body;
    let resourceId = resource.match(/(MLA)?\d+/)[0];

    console.log(`Received '${topic}' notification: `, req.body);

    try {
        const account = await Account.findOne({id: user_id});
        const handler = notificationHandler[topic];
        if(typeof handler === "function") {
            await handler(account, resourceId);
        } else {
            console.log(`Notiifcation topic '${topic}' not yet handled.`);
        }
    } catch(e) {
        console.log(e.message, e.stack);
        return next(e);
    }
    res.sendStatus(200);
});

module.exports = router;