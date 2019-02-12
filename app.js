// Get env variables
const path = require('path')
require('dotenv').config({path: path.resolve(__dirname, '.env')})

const express = require('express')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const db = require('./config/db')
const {port = 3000} = require('./config')

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
app.use('/public', express.static(path.join(__dirname, 'public')))

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

let server

function startServer() {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        resolve(server)
      })
    } catch (error) {
      reject(error)
    }
  })
}

function closeServer() {
  return new Promise(resolve => {
    if (!server || !server.close) {
      return resolve()
    }

    server.close(resolve)
  })
}

let dbConnection = null

async function setup() {
  await Promise.all([
    db.connect()
      .then(connection => {
        const {connection: {name, host, port}} = connection
        console.log(`db connection open: ${host}:${port}/${name}`)
        dbConnection = connection
      }),
    startServer()
      .then(server => console.log(`Listening on port ${server.address().port} (${app.get('env')})`))
  ])

  console.log('App is running.')
}

async function shutdown(code = 0) {
  await closeServer()
  if (dbConnection) {
    await db.disconnect(dbConnection)
  }
  process.exitCode = code
}

process.on('SIGINT', async () => {
  console.log('\nGracefully shutting down from SIGINT (Ctrl-C)')
  await shutdown()
})

process.on('SIGTERM', async () => {
  console.log('\nGracefully shutting down from SIGTERM')
  await shutdown()
})

setup()
  .catch(async error => {
    console.error('Unexpected error on app startup:', error)
    await shutdown(1)
  })

module.exports = app
