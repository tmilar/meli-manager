const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const {ExtractJwt} = require('passport-jwt')
const LocalStrategy = require('passport-local')
const config = require('../../config')
const User = require('../models/user')

// Create local strategy
const localOptions = {usernameField: 'email'}
const localLogin = new LocalStrategy(localOptions, async (email, password, done) => {
  // Verify this email and password, call done with the user
  // if it is the correct email and password
  // otherwise, call done with false
  let user
  try {
    user = await User.findOne({email})
  } catch (error) {
    return done(error)
  }
  if (!user) {
    return done(null, false)
  }
  // Compare passwords - is `password` equal to user.password?
  user.comparePassword(password, (err, isMatch) => {
    if (err) {
      return done(err)
    }
    if (!isMatch) {
      return done(null, false)
    }
    return done(null, user)
  })
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
  let user
  try {
    user = await User.findById(payload.sub)
  } catch (error) {
    return done(error, false)
  }
  done(null, user || false)
})

// Tell passport to use this strategy
passport.use(jwtLogin)
passport.use(localLogin)
