const moment = require('moment-timezone')
moment.tz.setDefault('America/Argentina/Buenos_Aires')
const dateToString = date => date ? moment(date).format('YYYY-MM-DD HH:MM:SS') : undefined
const urlToSheetsHyperlink = (url, title = '') => `=HYPERLINK("${url}", "${title}")`

const columns = new Map([
  ['sellerNickname', {header: 'Vendedor', column: 'Vendedor', colPos: 1}],
  ['sellerId', {header: 'id_vendedor', column: 'id_vendedor', colPos: 2}],
  ['id', {header: 'id_pregunta', column: 'id_pregunta', colPos: 3}],
  ['customerNickname', {header: 'Comprador', column: 'Comprador', colPos: 4}],
  ['customerId', {header: 'id_comprador', column: 'id_comprador', colPos: 5}],
  ['itemTitle', {header: 'Publicacion', column: 'Publicacion', colPos: 6}],
  ['itemId', {header: 'id_publicacion', column: 'id_publicacion', colPos: 7}],
  ['questionText', {header: 'Pregunta', column: 'Pregunta', colPos: 8}],
  ['date', {header: 'Fecha Pregunta', column: 'Fecha Pregunta', colPos: 9}],
  ['answerText', {header: 'Respuesta', column: 'Respuesta', colPos: 10}],
  ['answerDate', {header: 'Fecha Respuesta', column: 'Fecha Respuesta', colPos: 11}]
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
}

module.exports = QuestionMapper
