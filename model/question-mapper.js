const columns = new Map([
  ['', {header: 'Vendedor', column: 'Vendedor', colPos: 1}],
  ['seller_id', {header: 'id_vendedor', column: 'id_vendedor', colPos: 2}],
  ['id', {header: 'id_pregunta', column: 'id_pregunta', colPos: 3}],
  ['', {header: 'Comprador', column: 'Comprador', colPos: 4}],
  ['from.id', {header: 'id_comprador', column: 'id_comprador', colPos: 5}],
  ['', {header: 'Publicacion', column: 'Publicacion', colPos: 6}],
  ['item_id', {header: 'id_publicacion', column: 'id_publicacion', colPos: 7}],
  ['', {header: 'Pregunta', column: 'Pregunta', colPos: 8}],
  ['date_created', {header: 'Fecha Pregunta', column: 'Fecha Pregunta', colPos: 9}],
  ['answer.text', {header: 'Respuesta', column: 'Respuesta', colPos: 10}],
  ['answer.date_created', {header: 'Fecha Respuesta', column: 'Fecha Respuesta', colPos: 11}]
])

class QuestionMapper {
  static getColumns() {
    return columns
  }
}

module.exports = QuestionMapper
