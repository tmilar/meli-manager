const mongoose = require('mongoose')
const {Schema} = mongoose
const bcrypt = require('bcrypt-nodejs')
require('mongoose-type-email')

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
  let salt, hash
  try {
    salt = await bcrypt.genSalt(10, () => {})
    hash = await bcrypt.hash(user.password, salt, null, () => {})
  } catch (error) {
    return next(error)
  }
  user.password = hash
  next()
})

userSchema.methods.comparePassword = function (candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) {
      return callback(err)
    }
    callback(null, isMatch)
  })
}

// Create the model class
const ModelClass = mongoose.model('user', userSchema)

// Export the model
module.exports = ModelClass
