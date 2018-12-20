const config = require('../config')
const MeliClient = require('../lib/meli-client.js')
const Account = require('../model/account')
const SheetsHelper = require('../lib/sheets-helper')
const QuestionMapper = require('../model/question-mapper')

class QuestionsService {
  static async setup() {
    await this.setupMeliClient()
    await this.setupQuestionsSheet()
  }

  static async setupMeliClient() {
    this.meliClient = new MeliClient()

    const meliAccounts = await Account.find()
    meliAccounts.forEach(account => this.meliClient.addAccount(account))

    console.log('[QuestionsService] meli client initialized with accounts: ' +
      `${this.meliClient.accounts.map(({nickname}) => nickname).join(', ')}`)
  }

  static async setupQuestionsSheet() {
    const questionsSpreadsheet = config.spreadsheet.questions

    this.questionsSheet = new SheetsHelper()
    this.headerRowHeight = 1
    this.headerRowWidth = QuestionMapper.getColumns().keys().length

    await this.questionsSheet.setupSheet({
      credentials: config.auth.spreadsheet,
      spreadsheetsKey: questionsSpreadsheet.id,
      sheetName: questionsSpreadsheet.sheet,
      headerRowHeight: this.headerRowHeight,
      headerRowWidth: this.headerRowWidth
    })
  }

  static async saveOrUpdateQuestion(sellerAccount, questionId) {
    const [{account: seller, response: question}] = await this.meliClient.getQuestion(questionId, sellerAccount)
    const customer = await this.meliClient.getUser(question.from.id)
    const item = await this.meliClient.getListingById(question.item_id, sellerAccount)

    console.log('Question body is: ', question)

    const questionRow = QuestionMapper.mapMeliQuestionToRow(question, seller, customer, item)
    const idColumn = QuestionMapper.getIdColumnPosition()
    await this.questionsSheet.updateOrAppendRow(questionRow, idColumn)
  }

  static async answerQuestion(sellerId, questionId, answerText) {
    const answeringAccount = await this.meliClient.getUser(sellerId)
    return this.meliClient.postQuestionAnswer(answeringAccount, questionId, answerText)
  }

  static async getQuestions({accounts, status}) {
    return this.meliClient.getQuestions({accounts, status})
  }
}

QuestionsService
  .setup()
  .then(() => console.log('Questions Service ready.'))

module.exports = QuestionsService
