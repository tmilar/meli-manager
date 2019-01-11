function parseGoogleSpreadsheetKey(keyString) {
  if (!keyString || keyString.length === 0) {
    console.error('No key string defined!')
    return null
  }
  const newlineToken = '##NEW_LINE##'
  const dashesToken = '##DASHES##'
  const replaceNewline = string => string.replace(new RegExp(newlineToken, 'g'), '\\n')
  const replaseDashes = string => string.replace(new RegExp(dashesToken, 'g'), '-----')
  const parseKey = key => replaceNewline(replaseDashes(key))
  const spreadsheetPrivateKey = parseKey(keyString)

  return JSON.parse(`"${spreadsheetPrivateKey}"`)
}
const config = {
  db: process.env.MONGODB_URL,
  spreadsheet: {
    orders: {
      id: process.env.ORDERS_SPREADSHEET_ID,
      sheet: process.env.ORDERS_SPREADSHEET_SHEETNAME,
      sheetId: 1
    },
    customers: {
      id: process.env.CUSTOMERS_SPREADSHEET_ID,
      sheet: process.env.CUSTOMERS_SPREADSHEET_SHEETNAME
    },
    questions: {
      id: process.env.QUESTIONS_SPREADSHEET_ID,
      sheet: process.env.QUESTIONS_SPREADSHEET_SHEETNAME
    }
  },
  auth: {
    mercadolibre: {
      clientId: Number(process.env.MELI_CLIENT_ID),
      clientSecret: process.env.MELI_CLIENT_SECRET
    },
    spreadsheet: {
      type: 'service_account',
      project_id: 'meli-manager',
      private_key_id: process.env.SPREADSHEET_PRIVATE_KEY_ID,
      private_key: parseGoogleSpreadsheetKey(process.env.SPREADSHEET_PRIVATE_KEY),
      client_email: process.env.SPREADSHEET_CLIENT_EMAIL,
      client_id: process.env.SPREADSHEET_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://accounts.google.com/o/oauth2/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/meli-spreadsheets-manager%40meli-manager.iam.gserviceaccount.com'
    }
  }
}

module.exports = config
