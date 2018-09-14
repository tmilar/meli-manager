const app = require('express')()
const chromeLauncher = require('chrome-launcher')
const {Spinner} = require('cli-spinner')
const auth = require('../../routes/auth')
const meliAuth = require('../../config/meli-auth')

const port = process.env.PORT
const TIMEOUT_MS = 100 * 1000

const state = {
  spinner: null,
  chromeWindow: null
}

function onAuthSuccess() {
  state.spinner.stop(true)
  console.log('Account Auth success!')
  state.chromeWindow.kill()
  process.exit()
}

function onAuthAbort() {
  state.spinner.stop(true)
  console.log('User aborted login (Chrome window closed).')
  process.exit()
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
      const now = new Date()
      const millisLeft = dateEnd - now.getTime()
      const secondsLeft = Math.max(Math.ceil(millisLeft / 1000), 0)
      const timeLeftMsg = `Waiting login... ${secondsLeft} seconds left ${millisLeft <= 0 ? '\n' : ''}`
      this.clearLine(this.stream)
      this.stream.write(msg + timeLeftMsg)
      if (millisLeft <= 0) {
        spinner.stop()
      }
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

  setTimeout(() => {
    console.log('Timeout.')
    state.chromeWindow.kill()
    process.exit()
  }, TIMEOUT_MS)
}

function setupOAuthRouter(app) {
  // Override auth success behavior
  app.use('/auth/success', onAuthSuccess)

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
    try {
      const server = app.listen(port, () => resolve(server))
    } catch (error) {
      reject(error)
    }
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
  }

  /**
   * Run authentication Flow.
   * @returns {Promise<any>} - resolves to the logged user profile + credentials
   */
  async run() {
    if (!this.server) {
      throw new Error('Express OAuth server is not running!')
    }

    // Override default meli-passport-strategy Auth callback -> do no-operation, only return the result.
    const loggedUserPromise = new Promise(resolve => {
      meliAuth.onAuth = (profile, tokens) => {
        const loggedUser = {profile, tokens}
        resolve(loggedUser)
      }
    })

    await promptOauthLogin(this.server)
    return loggedUserPromise
  }
}

module.exports = new CliLoginFlow()
