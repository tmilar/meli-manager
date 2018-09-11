const inquirer = require('inquirer')

const choices = [
  {
    name: 'Create a new Test account',
    value: 'newTestAccount',
    short: 'Test account'
  },
  {
    name: 'Login & Register existing account',
    value: 'existingAccount',
    short: 'Existing account'
  },
  new inquirer.Separator(),
  {
    name: 'Exit',
    value: 'exit'
  }
]

const actionQuestion = {
  type: 'list',
  name: 'action',
  message: 'What do you want to do?',
  choices
}

const questions = [actionQuestion]

/**
 * Exports inquirer question.
 *
 * Promise resolves to selected choice value.
 */
module.exports = () => inquirer.prompt(questions)
