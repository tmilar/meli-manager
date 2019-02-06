const config = require('../config')
const MeliClient = require('../lib/meli-client')
const SheetsHelper = require('../lib/sheets-helper')
const Account = require('../model/account')
const QuestionMapper = require('../model/question-mapper')

class QuestionsService {
  /**
   * Setup & Create a new QuestionsService instance.
   * @return {QuestionsService} questionService new instance
   */
  static async build() {
    const [questionsSheet, meliClient] = await Promise.all([
      this.setupQuestionsSheet(),
      this.setupMeliClient()
    ])

    return new QuestionsService(questionsSheet, meliClient)
  }

  static async setupQuestionsSheet() {
    const questionsSpreadsheet = config.spreadsheet.questions

    const questionsSheet = new SheetsHelper()
    const headerRowHeight = 1
    const headerRowWidth = QuestionMapper.getColumns().keys().length

    await questionsSheet.setupSheet({
      credentials: config.auth.spreadsheet,
      spreadsheetsKey: questionsSpreadsheet.id,
      sheetName: questionsSpreadsheet.sheet,
      headerRowHeight,
      headerRowWidth
    })

    return questionsSheet
  }

  static async setupMeliClient() {
    const accounts = await Account.findAllCached()
    const meliClient = new MeliClient()
    accounts.forEach(account => meliClient.addAccount(account))
    console.log(`[QuestionsService] Using accounts: '${meliClient.accounts.map(({nickname}) => nickname).join('\', \'')}'`)
    return meliClient
  }

  constructor(questionsSheet, meliClient) {
    this.questionsSheet = questionsSheet
    this.meliClient = meliClient
  }

  async saveOrUpdateQuestion(sellerAccount, question) {
    if (typeof question === 'number' || typeof question === 'string') {
      // 'question' is id - retrieve remaining question data
      const questionId = question
      const [{account, response}] = await this.meliClient.getQuestion(questionId, sellerAccount)
      question = response
      sellerAccount = account
    }

    const customer = await this.meliClient.getUser(question.from.id)
    const item = await this.meliClient.getListingById(question.item_id, sellerAccount)

    const questionRow = QuestionMapper.mapMeliQuestionToRow(question, sellerAccount, customer, item)
    const idColumn = QuestionMapper.getIdColumnPosition()
    await this.questionsSheet.updateOrAppendRow(questionRow, idColumn)
  }

  async answerQuestion(sellerId, questionId, answerText) {
    const answeringAccount = await this.meliClient.getUser(sellerId)
    return this.meliClient.postQuestionAnswer(answeringAccount, questionId, answerText)
  }

  getQuestions({accounts, status, startDate, endDate}) {
    return this.meliClient.getQuestions({accounts, status, startDate, endDate})
  }
}

module.exports = QuestionsService
