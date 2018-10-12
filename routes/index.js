const express = require('express')

const router = express.Router()
const passport = require('passport')
const Authentication = require('../auth/controllers/authentication')
const passportService = require('../auth/services/passport')

const requireAuth = passport.authenticate('jwt', {session: false})
const requireSignin = passport.authenticate('local', {session: false})

router.post('/signin', requireSignin, Authentication.signin)
router.post('/signup', Authentication.signup)

/* GET home page. */
router.get('/*', requireAuth, (req, res, next) => {
  next()
})

module.exports = router
