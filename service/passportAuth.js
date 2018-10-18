const passportAuth = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const {ExtractJwt} = require('passport-jwt')
const LocalStrategy = require('passport-local')
const config = require('../config')
const User = require('../model/user')

// Create local strategy
const localOptions = {usernameField: 'email'}
const localLogin = new LocalStrategy(localOptions, async (email, password, done) => {
  let user
  try {
    user = await User.signin(email, password)
    return done(null, user)
  } catch (error) {
    return done(error, false)
  }
})

// Setup options for JWT Strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.auth.systemAuth.secret
}

// Create JWT strategy
const jwtLogin = new JwtStrategy(jwtOptions, async (payload, done) => {
  // See if the user ID in the payload exists in our database
  // If it does, call 'done' with that other
  // otherwise, call done without a user object
  const userId = payload.sub
  let user
  try {
    user = await User.findById(userId)
  } catch (error) {
    return done(error, false)
  }
  done(null, user || false)
})

// Setup method to tell passport to use this strategy
const setup = () => {
  passportAuth.use(jwtLogin)
  passportAuth.use(localLogin)
}

module.exports = {setup}

