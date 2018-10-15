const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const config = require('.')

/**
 * Connect to mongo DB.
 * @returns {Promise<*>} - resolves to mongoose instance if successful, rejects otherwise.
 */
const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }
  if (mongoose.connection.readyState === 2) {
    console.log('DB is already connecting, please wait.')
    return mongoose
  }
  let ret
  try {
    ret = await mongoose.connect(config.db)
  } catch (error) {
    console.error('db connection error:', error.message)
    throw error
  }

  return ret
}

/**
 * Explicitly close mongo db connection.
 *
 * @returns {Promise<void>} - exec promise
 */
const disconnect = () => {
  return mongoose.disconnect()
}

module.exports = {connect, disconnect}
