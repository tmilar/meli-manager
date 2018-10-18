/* eslint-disable no-use-extend-native/no-use-extend-native */
const mongoose = require('mongoose')
const Promise = require('bluebird')

const {Schema} = mongoose
const bcrypt = require('bcrypt-nodejs')
require('mongoose-type-email')
const jwt = require('jwt-simple')
const config = require('../config')
const UserError = require('../errors/UserError')

// Define our model
const userSchema = new Schema({
  email: {type: mongoose.SchemaTypes.Email, unique: true, lowercase: true},
  password: String
})

// On Save Hook, encrypt password
// Before saving a model, run this function
userSchema.pre('save', async function (next) {
  // Get access to the user model
  const user = this

  // Generate a salt then run callback
  let salt
  let hash
  const getSalt = Promise.promisify(bcrypt.genSalt)
  const encrypt = Promise.promisify(bcrypt.hash)
  try {
    salt = await getSalt(10)
    hash = await encrypt(user.password, salt, null)
  } catch (error) {
    return next(error)
  }
  user.password = hash
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcryptCompare = Promise.promisify(bcrypt.compare)
  return await bcryptCompare(candidatePassword, this.password)
}

userSchema.methods.tokenForUser = function () {
  const timestamp = new Date().getTime()
  return jwt.encode({sub: this.id, iat: timestamp}, config.auth.systemAuth.secret)
}

userSchema.statics.signup = async function ({email, password}) {
  if (!email || !password) {
    throw new UserError('You must provide email and password', 422)
  }

  // See if a user with the given email exists
  const existingUser = await User.findOne({email})

  // If a user with email does exist, return an error
  if (existingUser) {
    throw new UserError('Email is in use', 422)
  }

  // If a user with email does NOT exist, create and save user record
  let user = new User({
    email,
    password
  })
  user = await user.save()
  return user
}

userSchema.statics.signin = async function (email, password) {
  // Verify this email and password, call done with the user
  // if it is the correct email and password
  // otherwise, call done with false
  let user
  let isMatch
  try {
    user = await User.findOne({email})
    isMatch = await user.comparePassword(password)
  } catch (error) {
    throw new UserError('Error signing in', 401)
  }
  if (!user || !isMatch) {
    throw new UserError('Error signing in', 401)
  }
  return user
}

// Create the model class
const User = mongoose.model('user', userSchema)

// Export the model
module.exports = User
