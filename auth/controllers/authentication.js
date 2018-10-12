const jwt = require('jwt-simple')
const User = require('../models/user')
const config = require('../../config')

function tokenForUser(user) {
  const timestamp = new Date().getTime()
  return jwt.encode({sub: user.id, iat: timestamp}, config.auth.systemAuth.secret)
}

exports.signin = function (req, res) {
  // User has already had their email and password auth'd
  // We just need to give them a token
  res.send({token: tokenForUser(req.user)})
}

exports.signup = async function (req, res, next) {
  const {email, password} = req.body

  if (!email || !password) {
    return res.status(422).send({error: 'You must provide email and password'})
  }

  // See if a user with the given email exists
  let existingUser
  try {
    existingUser = await User.findOne({email})
  } catch (error) {
    next(error)
  }

  // If a user with email does exist, return an error
  if (existingUser) {
    return res.status(422).send({error: 'Email is in use'})
  }

  // If a user with email does NOT exist, create and save user record
  const user = new User({
    email,
    password
  })

  try {
    await user.save()
    res.json({token: tokenForUser(user)})
  } catch (error) {
    return next(error)
  }
}
