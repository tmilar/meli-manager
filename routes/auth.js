const router = require('express').Router()

const {passport} = require('../lib/meli-auth')

passport.serializeUser((user, cb) => {
  cb(null, user)
})

passport.deserializeUser((obj, cb) => {
  cb(null, obj)
})

router.get('/mercadolibre', passport.authorize('mercadolibre'))

router.get('/mercadolibre/callback', passport.authorize('mercadolibre', {failureRedirect: '/auth/error'}),
  (req, res) => {
    // Successful authentication, redirect home.
    console.log('Successful login!')
    res.redirect('/auth/success')
  })

router.get('/success', (req, res) => res.send('You have successfully logged in'))

router.get('/error', (req, res) => res.send('error logging in'))

module.exports = router
