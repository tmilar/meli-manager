var express = require('express');
import moment from "moment";
var router = express.Router();

router.get('/order/fetch', (req, res) => {
    let startStr = req.query.start;
    let endStr = req.query.end;
    let dateStart = moment(startStr, 'MM-DD-YY');
    let dateEnd = moment(endStr, 'MM-DD-YY');

})