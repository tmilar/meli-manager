// Get env variables
require('dotenv').config({path: path.resolve(__dirname, '.env')})

const path = require('path')
const express = require('express')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

// Mount db connection
require('./config/db')

const index = require('./routes')
const auth = require('./routes/auth')
const order = require('./routes/order')
const notification = require('./routes/notification')

const app = express()

// View engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')

// Uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

const authorizeAccounts = require('./lib/authorize-accounts')

// Setup routes
app.use('/', index)
app.use('/auth', auth)
app.use('/order', authorizeAccounts, order)
app.use('/notification', authorizeAccounts, notification)

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Error handler
app.use((err, req, res) => {
  // Set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
