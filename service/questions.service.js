const MeliClient = require('../lib/meli-client.js')
const Account = require('../model/account')

class QuestionsService {
  static async setup() {
    await this.setupMeliClient()
  }

  static async setupMeliClient() {
    this.meliClient = new MeliClient()

    const meliAccounts = await Account.find()
    meliAccounts.forEach(account => this.meliClient.addAccount(account))

    console.log('[QuestionsService] meli client initialized with accounts: ' +
      `${this.meliClient.accounts.map(({nickname}) => nickname).join(', ')}`)
  }

}

QuestionsService
  .setup()
  .then(() => console.log('Questions Service ready.'))

module.exports = QuestionsService
