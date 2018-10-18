const User = require('../model/user')

exports.signin = function (req, res) {
  // User has already had their email and password auth'd
  // We just need to give them a token
  res.send({token: req.user.tokenForUser()})
}

exports.signup = async function (req, res, next) {
  const {email, password} = req.body
  try {
    const user = await User.signup({email, password})
    res.json({token: user.tokenForUser()})
  } catch (error) {
    const {status, message} = error
    if (status) {
      return res.status(status).send({error: message})
    }
    next(error)
  }
}
