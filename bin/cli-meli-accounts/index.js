#!/usr/bin/env node
const prompt = require('./prompt')

const options = {
  newTestAccount: () => {
    console.log('creating test account...')
    console.log('the test account is: {user: pepe, pass: *****}')
    console.log('logging in...')
    console.log('registering...')
    console.log('done!')
  },
  existingAccount: () => {
    console.log('please log in with existing account.')
    console.log('ok! registering...')
    console.log('done!')
  },
  exit: () => {
    console.log('Bye!')
  }
}

async function main() {
  console.log('Welcome!')

  let choice
  do {
    choice = await prompt()
    let selectedAction = options[choice.action]
    if(!selectedAction) {
      throw new Error(`Selected option is not valid: ${JSON.stringify(choice)}`)
    }
    await selectedAction()
  } while (choice.action !== 'exit')
}

main()
