var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

router.get('/success', (req, res) => res.send("You have successfully logged in"));

router.get('/error', (req, res) => res.send("error logging in"));

router.get('/welcome', ensureAuthenticated,
    function (req, res) {
        res.send("Logged in user: " + req.user.nickname);
    }
);

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }

    res.redirect('/auth/mercadolibre');
}

module.exports = router;
