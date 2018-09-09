const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const config = require('.')

/**
 * Connect to mongo DB.
 * @returns {Promise<*>} - resolves to mongoose instance if successful, rejects otherwise.
 */
const connect = async () => {
  let ret
  try {
    ret = await mongoose.connect(config.db)
    console.log('db connection open')
  } catch(error) {
    console.error('db connection error:', error.message)
    throw error
  }

  return ret
}

module.exports = {connect}
