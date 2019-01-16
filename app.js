// Get env variables
const path = require('path')
require('dotenv').config({path: path.resolve(__dirname, '.env')})
const {Server: server} = require('http')
const express = require('express')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const db = require('./config/db')
const {port = 3000} = require('./config')

const QuestionsService = require('./service/questions.service')
const OrdersService = require('./service/orders.service')
const Account = require('./model/account')

const index = require('./routes')
const auth = require('./routes/auth')
const order = require('./routes/order')
const question = require('./routes/question')

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

// Setup routes
app.use('/', index)
app.use('/auth', auth)
app.use('/order', order)
app.use('/question', question)
app.use('/notification', notification)

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

function startServer() {
  const http = server(app)

  return new Promise((resolve, reject) => {
    try {
      http.listen(port, () => {
        resolve(port)
      })
    } catch (error) {
      reject(error)
    }
  })
}

async function setup() {
  await Promise.all([
    db.connect()
      .then(({connection: {name, host, port}}) => console.log(`db connection open: ${host}:${port}/${name}`)),
    QuestionsService.setup(),
    OrdersService.setup(),
    Account.findAllCached()
      .then(accounts => console.log(`Using accounts: '${accounts.map(({nickname}) => nickname).join('\', \'')}'`)),
    startServer()
      .then(port => console.log(`Listening on port ${port} (${app.get('env')})`))
  ])

  console.log('App is running.')
}

setup()
  .catch(error => console.error('Unexpected error on app startup:', error))

module.exports = app
