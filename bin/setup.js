#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const program = require('commander')

program
  .version('0.1.0')
  .description('Intialize a fresh .env file using an .env.sample file.')
  .option('-f, --force', 'Override existing file, thus creating a new one.')
  .option('-p, --path [relativePath]', 'Execute in the specified directory.')
  .parse(process.argv)

const {force, path: basePath = '.'} = program

const ENV = '.env'
const ENV_SAMPLE = '.env.sample'

function main() {
  const envPath = path.join(basePath, ENV)
  const envSamplePath = path.join(basePath, ENV_SAMPLE)

  console.log(envPath, envSamplePath)
  if (fs.existsSync(envPath) && !force) {
    console.log(`${envPath} file already exists! Add --force option to override.`)
    return process.exit(1)
  }

  if (!fs.existsSync(envSamplePath)) {
    throw new Error(`${envSamplePath} file doesn't exist!`)
  }

  fs.createReadStream(envSamplePath)
    .pipe(fs.createWriteStream(envPath))

  console.log(`Created ${ENV} file from ${ENV_SAMPLE}`)
}

main()
