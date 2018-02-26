const router = require('express').Router();
const moment = require('moment');
const Account = require('../model/account');
const OrderService = require("../service/orders.service.js");

const notificationHandler = {
    orders: (account, orderId) => {
        console.log(`New order for ${account.nickname}! Not yet handled.`, orderId);
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
    console.log(`Received '${topic}' notification: `, req.body);
    res.sendStatus(200);

    const account = await Account.findOne({id: user_id});

    notificationHandler[topic](account, resource);
});

module.exports = router;