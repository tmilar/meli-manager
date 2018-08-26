const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const config = require('.')

const connect = () => {
  mongoose.connect(config.db)

  const db = mongoose.connection
  db.on('error', console.error.bind(console, 'connection error:'))
  db.once('open', () => {
    console.log('db connection open')
    // We're connected!
  })
}

module.exports = {connect}
