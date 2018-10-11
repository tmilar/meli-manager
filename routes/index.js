const express = require('express')
const router = express.Router()
const Authentication = require('../auth/controllers/authentication');
const passportService = require('../auth/services/passport');
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });
const requireSignin = passport.authenticate('local', { session: false });

// module.exports = function(app) {
//     app.get('/', requireAuth, function(req, res) {
//         res.send({ hi: 'there' });
//     });
//     app.post('/signin', requireSignin, Authentication.signin);
//     app.post('/signup', Authentication.signup);
// }



/* GET home page. */
router.get('/', requireAuth, (req, res) => {
  res.render('index', {title: 'Express'})
})

module.exports = router
