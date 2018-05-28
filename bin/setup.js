/**
 * Initialize .env file
 */

'use strict'
const fs = require('fs')

fs.createReadStream('.env.sample')
  .pipe(fs.createWriteStream('.env'))
