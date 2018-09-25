const inquirer = require('inquirer')

const state = {
  isDbConnected: false,
}

const choices = () => {
  return [
    {
      name: 'Create a new Test account',
      value: 'newTestAccount',
      short: 'Test account'
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
 * @param {Object}  currentState
 * @param {boolean} currentState.isDbConnected

 * @returns {Promise<Object>} - resolves to selected answer {action: 'selected'}
 */
module.exports = ({isDbConnected} = {}) => {
  // Update internal state first
  Object.assign(state, {isDbConnected})
  // Render inquirer questions
  return inquirer.prompt(questions)
}
