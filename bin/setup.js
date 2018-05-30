/**
 * Initialize .env file
 * @param --force [optional] overrides the .env file even if it exists.
 */
'use strict'
const fs = require('fs')

const args = process.argv.slice(2)
const force = args[0] === '--force'

const ENV = '.env'
const ENV_SAMPLE = '.env.sample'

function main() {
  if (fs.existsSync(ENV) && !force) {
    console.log(`${ENV} file already exists! Add --force option to override.`)
    process.exitCode = 1
    return
  }

  fs.createReadStream(ENV_SAMPLE)
    .pipe(fs.createWriteStream(ENV))

  console.log(`Created ${ENV} file from ${ENV_SAMPLE}`)
}

main()
