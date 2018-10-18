const express = require('express')
const router = express.Router()
const passport = require('passport')
const {signup, signin} = require('../controllers/authentication')
const {setup: authSetup} = require('../service/passportAuth')

authSetup()
const requireAuth = passport.authenticate('jwt', {session: false})
const requireSignin = passport.authenticate('local', {session: false})

router.post('/signin', requireSignin, signin)
router.post('/signup', signup)

/* GET home page. */
router.get('/*', requireAuth, (req, res, next) => {
  next()
})

module.exports = router
