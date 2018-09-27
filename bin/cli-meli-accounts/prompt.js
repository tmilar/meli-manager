const inquirer = require('inquirer')

const state = {
  isDbConnected: false,
  isFirstLogin: true
}

const choices = () => {
  return [
    {
      name: 'Create a new Test account',
      value: 'newTestAccount',
      short: 'Test account',
      disabled: state.isFirstLogin && 'Please Login first.'
    },
    {
      name: `Login ${state.isDbConnected ? '& Register ' : ''}existing account`,
      value: 'existingAccount',
      short: 'Existing account'
    },
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
 * @param {boolean} currentState.isFirstLogin        - true if no valid authorized Account is present
 *
 * @returns {Promise<Object>} - resolves to selected answer {action: 'selected'}
 */
module.exports = ({isDbConnected, isFirstLogin}) => {
  // Update internal state first
  Object.assign(state, {isDbConnected, isFirstLogin})
  // Render inquirer questions promise
  return inquirer.prompt(questions)
}
