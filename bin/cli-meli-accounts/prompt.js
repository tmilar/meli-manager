const inquirer = require('inquirer')

const state = {
  isDbConnected: false,
  isLoginRequired: true
}

const choices = () => {
  const loginChoiceText = state.isDbConnected ? 'Login & Save existing account' : 'Login existing account'
  const loginChoiceShortText = state.isDbConnected ? 'Login & Save' : 'Login'

  const isFirstLoginChoice = state.isLoginRequired && {
    name: loginChoiceText,
    value: 'firstUserLogin',
    short: loginChoiceShortText
  }

  const loginExistingAccountChoice = {
    name: loginChoiceText,
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
    {
      name: 'List saved accounts',
      value: 'listAccounts',
      short: 'List accounts'
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
