const moment = require('moment-timezone')

moment.tz.setDefault('America/Argentina/Buenos_Aires')
const dateToString = date => date ? moment(date).format('YYYY-MM-DD HH:mm:SS') : undefined
const urlToSheetsHyperlink = (url, title = '') => `=HYPERLINK("${url}", "${title}")`

const columns = new Map([
  ['sellerNickname', {header: 'Vendedor', column: 'Vendedor'}],
  ['sellerId', {header: 'id_vendedor', column: 'id_vendedor'}],
  ['id', {header: 'id_pregunta', column: 'id_pregunta', colPos: 3}],
  ['customerNickname', {header: 'Comprador', column: 'Comprador'}],
  ['customerId', {header: 'id_comprador', column: 'id_comprador'}],
  ['itemTitle', {header: 'Publicacion', column: 'Publicacion'}],
  ['itemId', {header: 'id_publicacion', column: 'id_publicacion'}],
  ['questionText', {header: 'Pregunta', column: 'Pregunta'}],
  ['date', {header: 'Fecha Pregunta', column: 'Fecha Pregunta'}],
  ['questionStatus', {header: 'Estado Pregunta', column: 'Estado Pregunta'}],
  ['answerText', {header: 'Respuesta', column: 'Respuesta'}],
  ['answerDate', {header: 'Fecha Respuesta', column: 'Fecha Respuesta'}],
  ['answerStatus', {header: 'Estado Respuesta', column: 'Estado Respuesta'}]
])

class Question {
  static buildFromMeliQuestion(meliQuestion, seller, customer, item) {
    if (!meliQuestion.answer) {
      meliQuestion.answer = undefined
    }

    const {
      id,
      date_created: date,
      item_id: itemId,
      seller_id: sellerId,
      status: questionStatus,
      text: questionText,
      answer: {
        text: answerText,
        status: answerStatus,
        date_created: answerDate
      } = {},
      from: {
        id: customerId
      } = {}
    } = meliQuestion

    const {
      nickname: sellerNickname
    } = seller

    const {
      nickname: customerNickname
    } = customer

    const {
      title,
      permalink
    } = item

    const question = new Question()

    question.id = id
    question.date = dateToString(date)
    question.itemId = itemId
    question.itemTitle = urlToSheetsHyperlink(permalink, title)
    question.sellerId = sellerId
    question.sellerNickname = sellerNickname
    question.questionStatus = questionStatus
    question.questionText = questionText
    question.answerText = answerText
    question.answerStatus = answerStatus
    question.answerDate = dateToString(answerDate)
    question.customerId = customerId
    question.customerNickname = customerNickname

    return question
  }
}

class QuestionMapper {
  static getColumns() {
    return columns
  }

  static questionToRow(question) {
    const row = []
    let colPos = 0

    columns.forEach((value, key) => {
      if (question[key] !== undefined) {
        row[colPos] = question[key]
      }

      colPos++
    })

    return row
  }

  static mapMeliQuestionToRow(meliQuestion, seller, customer, item) {
    const question = Question.buildFromMeliQuestion(meliQuestion, seller, customer, item)
    const row = this.questionToRow(question)
    return row
  }

  static getIdColumnPosition() {
    return columns.get('id').colPos
  }
}

module.exports = QuestionMapper
