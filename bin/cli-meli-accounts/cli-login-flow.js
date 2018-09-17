const EventEmitter = require('events')
const app = require('express')()
const chromeLauncher = require('chrome-launcher')
const {Spinner} = require('cli-spinner')
const auth = require('../../routes/auth')
const meliAuth = require('../../config/meli-auth')

const port = process.env.PORT
if (!port) {
  throw new Error('CliLoginFlow: express OAuth server PORT env variable must be defined!')
}
const TIMEOUT_MS = 100 * 1000

class AuthEventEmitter extends EventEmitter {}
const authEventEmitter = new AuthEventEmitter()

const state = {
  spinner: null,
  chromeWindow: null
}

function onAuthSuccess(loggedUser) {
  state.spinner.stop(true)
  state.chromeWindow.process.removeListener('exit', onAuthAbort)
  state.chromeWindow.kill()
  authEventEmitter.emit('success', loggedUser)
}

function onAuthAbort() {
  state.spinner.stop(true)
  console.log('User aborted login (Chrome window closed).')
  authEventEmitter.emit('abort')
}

function onAuthTimeout() {
  state.spinner.stop(true)
  console.log('Timeout.')
  state.chromeWindow.process.removeListener('exit', onAuthAbort)
  state.chromeWindow.kill()
  authEventEmitter.emit('timeout')
}

async function launchChrome(loginUrl) {
  console.log(`Waiting for login on: ${loginUrl}`)
  const chrome = await chromeLauncher.launch({
    startingUrl: loginUrl
  })
  console.log('Chrome window opened.')
  chrome.process.once('exit', onAuthAbort)
  return chrome
}

function startWaitLoginSpinner() {
  const dateStart = new Date()
  const dateEnd = dateStart.getTime() + TIMEOUT_MS
  const spinner = new Spinner({
    text: '%s ',
    stream: process.stderr,
    onTick(msg) {
      // Calculate timers
      const now = new Date()
      const millisLeft = dateEnd - now.getTime()
      const secondsLeft = Math.max(Math.ceil(millisLeft / 1000), 0)
      const timeLeftMsg = `Waiting login... ${secondsLeft} seconds left ${millisLeft <= 0 ? '\n' : ''}`

      // Check timeout
      if (millisLeft <= 0) {
        onAuthTimeout()
        return
      }

      // Update text
      this.clearLine(this.stream)
      this.stream.write(msg + timeLeftMsg)
    }
  })
  spinner.setSpinnerString(19)
  spinner.start()
  return spinner
}

async function promptOauthLogin(server) {
  const {address} = server.address()
  const hostname = ['::', '127.0.0.1', 'localhost'].includes(address) ? 'localhost' : address
  const loginUrl = `http://${hostname}:${port}/auth/mercadolibre`
  state.chromeWindow = await launchChrome(loginUrl)
  state.spinner = startWaitLoginSpinner()
}

function setupOAuthRouter(app) {
  // Setup default MercadoLibre oauth routes
  app.use('/auth', auth)
}

/**
 * Start express server
 * @param {object} app - express instance
 * @returns {Promise<any>} - resolves to server instance
 */
function startServer(app) {
  // Start express server
  const serverPromise = new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server))
    server.on('error', error => reject(error))
  })
  return serverPromise
}

class CliLoginFlow {
  /**
   * Setup and start OAuth express server.
   *
   * @returns {Promise<void>} - resolves to express server instance
   */
  async setup() {
    setupOAuthRouter(app)
    this.server = await startServer(app)

    // Override default meli-passport-strategy Auth callback -> do no-operation, only return the result.
    meliAuth.onAuth = (profile, tokens) => {
      const loggedUser = {profile, tokens}
      onAuthSuccess(loggedUser)
    }
  }

  /**
   * Run authentication Flow.
   * @returns {Promise<any>} - resolves to the logged user profile + credentials
   */
  async run() {
    if (!this.server) {
      throw new Error('Express OAuth server is not running! Please call setup() method.')
    }

    const loggedUserPromise = new Promise((resolve, reject) => {
      authEventEmitter.once('success', loggedUser => {
        authEventEmitter.removeAllListeners()
        resolve(loggedUser)
      })

      authEventEmitter.once('timeout', () => {
        authEventEmitter.removeAllListeners()
        reject(new Error('Login timeout'))
      })

      authEventEmitter.once('abort', () => {
        authEventEmitter.removeAllListeners()
        reject(new Error('Login abort'))
      })
    })

    await promptOauthLogin(this.server)
    return loggedUserPromise
  }

  async clean() {
    await this.server.close()
  }
}

module.exports = new CliLoginFlow()
