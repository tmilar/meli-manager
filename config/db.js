const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
const config = require('./index')

mongoose.connect(config.db)

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('db connection open')
  // we're connected!
})
