const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const debugDbConnecting = require('debug')('db:connecting')
const {db: dbUrl} = require('.')

// Cache db connection so it can be reused, if kept in the global scope
let cachedDb = null

/**
 * Connect to mongo DB.
 * @returns {Promise<*>} - resolves to mongoose instance if successful, rejects otherwise.
 */
const connect = async () => {
  // If the database connection is cached,
  // use it instead of creating a new connection
  if (cachedDb && !_isConnected(cachedDb)) {
    cachedDb = null
    console.log('[mongoose] client discard')
  }

  if (cachedDb) {
    if (_isConnected(cachedDb)) {
      console.log('[mongoose] client connected, quick return')
    } else if (_isConnecting(cachedDb)) {
      console.log('[mongoose] client is already connecting, please wait. quick return')
    } else {
      console.log(`[mongoose] client status is ${cachedDb.connection.readyState}`)
    }
    return cachedDb
  }

  let db
  try {
    db = await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      /*
        Buffering allows Mongoose to queue up operations if MongoDB
        gets disconnected, and to send them upon reconnection.
        With serverless, it is better to fail fast when not connected.
      */
      bufferCommands: false,
      bufferMaxEntries: 0
    })
  } catch (error) {
    console.error('[mongoose] db connection error:', error.message)
    throw error
  }

  cachedDb = db

  return db
}

/**
 * Explicitly close mongo db connection.
 *
 * @returns {Promise<void>} - exec promise
 */
const disconnect = (db = mongoose) => {
  return db.disconnect()
}

/**
 * @returns {boolean} true if connection.state is 'connected' (value 1)
 * @private
 */
const _isConnected = function ({connection: {readyState}} = mongoose) {
  return readyState === 1
}

/**
 * @returns {boolean} true if connection.state is 'connecting' (value 2).
 * @private
 */
const _isConnecting = function ({connection: {readyState}} = mongoose) {
  return readyState === 2
}

/**
 *
 * @param {Number} maxChecks             - maximum connection checks to do
 * @param {Number} checkIntervalMillis   - time to wait between check
 * @returns {Promise<boolean>}           - resolves to true if DB status ended up as connected, false otherwise.
 * @private
 */
const _waitForConnection = async function (maxChecks, checkIntervalMillis) {
  let isConnectedResult = false
  let checks = 0
  while (!isConnectedResult && checks < maxChecks) {
    // eslint-disable-next-line no-await-in-loop
    isConnectedResult = await new Promise(resolve => {
      setTimeout(() => {
        checks++
        const checkResult = _isConnected()
        resolve(checkResult)
      }, checkIntervalMillis)
    })
    if (isConnectedResult) {
      debugDbConnecting(`DB connected after ${checks} checks.`)
    } else {
      debugDbConnecting(`DB status: connecting... (check #${checks} out of ${maxChecks})`)
    }
  }

  if (!isConnectedResult && checks === maxChecks) {
    debugDbConnecting(`DB did not connect after ${checks} checks.`)
  }

  return isConnectedResult
}

/**
 * Check if DB is connected.
 * @returns {Promise<boolean>} - resolves to true if DB is connected, false otherwise
 */
const isConnected = async () => {
  let isConnectedResult = _isConnected()

  if (!isConnectedResult && _isConnecting()) {
    // Is connecting -> do an async wait of 5 seconds and re-check each 0.5 seconds
    const MAX_CHECKS = 10
    const CHECK_INTERVAL_MILLIS = 500
    console.log(`DB status: 'connecting'. Starting check interval, up to ${MAX_CHECKS} tries each ${CHECK_INTERVAL_MILLIS}ms.`)
    isConnectedResult = await _waitForConnection(MAX_CHECKS, CHECK_INTERVAL_MILLIS)
  }

  return isConnectedResult
}

module.exports = {connect, disconnect, isConnected}
