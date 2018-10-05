const inquirer = require('inquirer')

const state = {
  isDbConnected: false,
  isLoginRequired: true
}

const choices = () => {
  const isFirstLoginChoice = state.isLoginRequired && {
    name: `Login ${state.isDbConnected ? '& Save ' : ''}existing account`,
    value: 'firstUserLogin',
    short: `Login ${state.isDbConnected ? '& Save ' : ''}`
  }

  const loginExistingAccountChoice = {
    name: `Login ${state.isDbConnected ? '& Save ' : ''}existing account`,
    value: 'existingAccount',
    short: 'Existing account'
  }

  return [
    {
      name: 'Create a new Test account',
      value: 'newTestAccount',
      short: 'Test account',
      disabled: state.isLoginRequired && 'Please Login first.'
    },
    isFirstLoginChoice || loginExistingAccountChoice,
    new inquirer.Separator(),
    {
      name: 'Exit',
      value: 'exit'
    }
  ]
}

const actionQuestion = {
  type: 'list',
  name: 'action',
  message: 'What do you want to do?',
  choices
}

const questions = [actionQuestion]

/**
 * Inquirer question prompt promise.
 *
 * @param {Object}  currentState                     - the current app state
 * @param {boolean} currentState.isDbConnected       - true if DB is currently connected
 * @param {boolean} currentState.isLoginRequired     - true if no valid authorized Account is present
 *
 * @returns {Promise<Object>} - resolves to selected answer {action: 'selected'}
 */
module.exports = ({isDbConnected, isLoginRequired}) => {
  // Update internal state first
  Object.assign(state, {isDbConnected, isLoginRequired})
  // Render inquirer questions promise
  return inquirer.prompt(questions)
}
