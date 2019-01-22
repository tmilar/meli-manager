const moment = require('moment-timezone')
moment.tz('America/Argentina/Buenos_Aires')

const columns = new Map([
  ['id', {header: 'id_venta', column: 'id_venta', colPos: 1}],
  ['dateCreated', {header: 'FechaVenta', column: 'fechaventa', colPos: 1}],
  ['buyerNicknameHyperlink', {header: 'Cliente', column: 'cliente', colPos: 3}],
  ['buyerId', {header: 'id_cliente', column: 'id_cliente'}],
  ['itemHyperlink', {header: 'Item / Descripcion', column: 'itemdescripcion', colPos: 4}],
  ['itemId', {header: 'id_item', column: 'id_item'}],
  ['itemQuantity', {header: 'Cantidad', column: 'cantidad', colPos: 5}],
  ['itemUnitPrice', {header: 'Precio', column: 'precio', colPos: 6}],
  ['itemSaleFee', {header: 'Valor Comision', column: 'valorcomision'}],
  ['shippingCost', {header: 'Valor Envio', column: 'valorenvio'}],
  ['totalAmount', {header: 'Total', column: 'total'}],
  ['orderDetailURL', {header: 'Link', column: 'link', colPos: 7}],
  ['sellerNickname', {header: 'Vendedor', column: 'vendedor', colPos: 8}],
  ['sellerId', {header: 'id_vendedor', column: 'id_vendedor'}],
  ['paymentType', {header: 'FormaPago', default: 'MP', column: 'formapago', colPos: 9}],
  ['shipmentType', {header: 'FormaEntrega', column: 'formaentrega', colPos: 10}],
  ['status', {header: 'Estado de venta', default: 'Nueva', column: 'estadodeventa', colPos: 11}],
  ['comments', {header: 'Comentarios', default: '', column: 'comentarios', colPos: 12}]
])

const updatableColumns = ['paymentType', 'shipmentType', 'status']

const orderStatus = {
  RESERVED: 'Reservada',
  CANCELLED: 'Cancelada',
  CANCELLED_QUESTION: 'Cancelada?',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  DELIVERED_EXPIRED: 'Entregada Vencida',
  UNKNOWN: 'DESCONOCIDO'
}

const paymentType = {
  CANCELLED: 'Cancelado',
  MP: 'MP',
  MP_PENDING: 'MP Pendiente',
  CASH: 'Efectivo',
  UNKNOWN: null
}

const deliveryType = {
  AGREED: 'Retiro',
  ME2: 'Envio: MercadoEnvios',
  OTHER: 'Envio: Otro',
  UNKNOWN: 'DESCONOCIDO'
}

class Order {
  /**
   *
   * @param meliOrderJson
   * @returns {Order}
   */
  static buildFromMeliOrder(meliOrderJson) {
    const {
      id,
      date_created: dateCreated,
      order_items: orderItems,
      seller,
      buyer,
      shipping,
      total_amount: totalAmount
    } = meliOrderJson

    // TODO: we need to support multiple items per order
    const [orderItem] = orderItems

    const {
      quantity: itemQuantity,
      unit_price: itemUnitPrice,
      sale_fee: itemSaleFee,
      item
    } = orderItem

    const order = new Order()
    order.id = id
    order.dateCreated = moment(dateCreated).format('DD/MMM/YYYY HH:mm')
    order.timeCreated = moment(dateCreated).format('HH:mm')
    order.buyerNicknameHyperlink = this._buyerProfileToHyperlink(buyer)
    order.buyerId = buyer.id
    order.itemQuantity = itemQuantity
    order.itemUnitPrice = itemUnitPrice
    order.itemSaleFee = itemSaleFee
    order.shippingCost = shipping.cost
    order.totalAmount = totalAmount
    order.orderDetailURL = `https://myaccount.mercadolibre.com.ar/sales/${id}/detail`
    order.sellerNickname = seller.nickname
    order.sellerId = seller.id

    order.paymentType = this._getPaymentType(meliOrderJson)
    order.paymentMethod = this._getPaymentMethod(meliOrderJson)
    order.shipmentType = this._getDeliveryType(meliOrderJson)
    order.status = this._getOrderStatus(meliOrderJson)
    order.comments = ''
    order.itemHyperlink = this._itemToHyperlink(item)
    order.itemTitle = item.title
    order.itemId = item.id
    order.buyer = buyer

    return order
  }

  /**
     * Convert item data to it's spreadsheets Hyperlink function.
     *
     * @param id
     * @param title
     * @returns {string}
     * @private
     */
  static _itemToHyperlink({id, title}) {
    const base = 'http://articulo.mercadolibre.com.ar/'
    const idstr = `${id.substring(0, 3)}-${id.substring(3)}-`
    const titlestr = title.toLowerCase().split(' ').join('-')
    const end = '-_JM'
    const url = base + idstr + titlestr + end
    return `=HYPERLINK("${url}","${title}")`
  }

  /**
     * Convert buyer profile to it's nickname spreadsheets hyperlink.
     *
     * @param nickname
     * @returns {string}
     * @private
     */
  static _buyerProfileToHyperlink({nickname}) {
    const base = 'https://perfil.mercadolibre.com.ar/'
    const url = base + nickname
    const title = nickname
    return `=HYPERLINK("${url}","${title}")`
  }

  /**
     * Convert Order to an array of values, ordered to be correctly placed as a row.
     *
     * @returns {Array}
     */
  toRowArray({update} = {}) {
    // Map Order properties to array values, in columns order.
    const orderRow = [...columns.keys()]
      .map(key => {
        return (Object.prototype.hasOwnProperty.call(this, key) && (!update || updatableColumns.includes(key))) ?
          this[key] :
          null
      })

    return orderRow
  }

  static _getOrderStatus(meliOrderJSON) {
    const {status, payments, shipping, feedback, date_closed: dateClosed, tags} = meliOrderJSON

    const pendingDeliveryStatuses = ['to_be_agreed', 'ready_to_ship', 'pending']

    // Se pago y se acuerda entrega ==> "reservado"
    if (status === 'paid' && pendingDeliveryStatuses.includes(shipping.status) && (feedback.purchase === null && feedback.sale === null)) {
      return orderStatus.RESERVED
    }

    if (status === 'paid' && shipping.status === 'to_be_agreed' && (feedback.sale !== null && feedback.sale.fulfilled)) {
      return orderStatus.DELIVERED
    }

    // Se pagó, se envio y se entrego ==> "entregado"
    if (status === 'paid' && (shipping.status === 'delivered' || tags.includes('delivered'))) {
      return orderStatus.DELIVERED
    }

    // Al menos uno califico como entregado ==> "entregado"
    if (((feedback.purchase !== null && feedback.purchase.fulfilled) ||
            (feedback.sale !== null && feedback.sale.fulfilled))
    ) {
      return orderStatus.DELIVERED
    }

    if (status === 'cancelled') {
      return orderStatus.CANCELLED
    }

    // Se confirmo la compra (no esta "paid") y los pagos estan todos "refunded" ==> "cancelada"
    if (status === 'confirmed' && payments.length > 0 && payments.every(p => p.status === 'refunded' || p.status === 'rejected')) {
      return orderStatus.CANCELLED
    }

    if (status === 'confirmed' &&
            ((feedback.purchase === null) ||
            (feedback.sale !== null && !feedback.sale.fulfilled))
    ) {
      return orderStatus.CANCELLED_QUESTION
    }

    // Se confirmo la compra (no esta "paid") pero alguien califico no concretado
    if (status === 'confirmed' &&
            ((feedback.purchase !== null && !feedback.purchase.fulfilled) &&
            (feedback.sale !== null && !feedback.sale.fulfilled))
    ) {
      return orderStatus.CANCELLED
    }

    if (status === 'paid' && shipping.status === 'to_be_agreed' && (Math.abs(moment(dateClosed).diff(new Date(), 'days')) > 21)) {
      // Pago: "MP"
      return orderStatus.DELIVERED_EXPIRED
    }
    // Se confirmo la compra (no esta "paid"), y pasaron 21 dias ==> "entregada"
    if (status === 'confirmed' && (Math.abs(moment(dateClosed).diff(new Date(), 'days')) > 21)) {
      // Pago: "efectivo"
      return orderStatus.DELIVERED_EXPIRED
    }

    if (shipping.shipment_type === 'shipping' && shipping.status === 'shipped') {
      return orderStatus.SHIPPED
    }

    console.log('Unknown orderStatus for order: ', meliOrderJSON)
    return orderStatus.UNKNOWN
  }

  static _getDeliveryType(meliOrderJSON) {
    const {shipping} = meliOrderJSON

    // No hay 'shipment_type' y en status 'to_be_agreed' => "Retiro"
    if (shipping.shipment_type === null && shipping.status === 'to_be_agreed') {
      return deliveryType.AGREED
    }

    // Tipo "shipping" , y modo "me2" => "Mercadoenvios"
    if (shipping.shipment_type === 'shipping' && shipping.shipping_mode === 'me2') {
      return deliveryType.ME2
    }

    // Tipo "shipping", y otro modo => "envio: otro"
    if (shipping.shipment_type === 'shipping' && shipping.shipping_mode !== 'me2') {
      return deliveryType.OTHER
    }

    console.log('Unknown deliveryType for order: ', meliOrderJSON)
    return deliveryType.UNKNOWN
  }

  static _getPaymentType(meliOrderJSON) {
    const {status, payments, shipping, date_closed, feedback} = meliOrderJSON

    // Se reintegraron los pagos, o alguno califico NO concretado => "Cancelado"
    if (status === 'confirmed' && (
      (payments.length > 0 && payments.every(p => p.status === 'refunded' || p.status === 'rejected')) ||
                ((feedback.purchase !== null && !feedback.purchase.fulfilled) ||
                (feedback.sale !== null && !feedback.sale.fulfilled))
    )
    ) {
      return paymentType.CANCELLED
    }

    // Se pago y (pasaron 21 dias o alguno puso concretado)=> MP
    if (status === 'paid' &&
            (
              shipping.status === 'delivered' ||
                (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21) ||
                (
                  (feedback.purchase !== null && feedback.purchase.fulfilled) ||
                    (feedback.sale !== null && feedback.sale.fulfilled)
                )
            )
    ) {
      return paymentType.MP
    }

    // No esta pago, y alguno puso concretado => Cash
    if (status === 'confirmed' && (
      (feedback.purchase !== null && feedback.purchase.fulfilled) ||
            (feedback.sale !== null && feedback.sale.fulfilled))
    ) {
      return paymentType.CASH
    }

    if (status === 'confirmed' && shipping.shipment_type !== 'shipping' && (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21)) {
      return paymentType.UNKNOWN
    }

    if (status === 'paid' && payments.length > 0 && payments.some(p => p.status === 'approved')) {
      return paymentType.MP_PENDING
    }

    return paymentType.UNKNOWN
  }

  static _getPaymentMethod(meliOrderJson) {
    const {payments} = meliOrderJson
    if (!payments || payments.length === 0) {
      return null
    }
    const accreditedPayments = payments.filter(p => p.status_detail === 'accredited')

    if (accreditedPayments.length === 0) {
      return null
    }
    return accreditedPayments[0].payment_type
  }

  static extractIdFromCellValue(orderDetailURL) {
    const orderIdMatches = orderDetailURL.match(/\d+/)
    if (!orderIdMatches || orderIdMatches.length === 0) {
      // Not a mercadolibre order!
      return null
    }
    return Number(orderIdMatches[0])
  }

  static getColumns() {
    return columns
  }

  static getIdColumn() {
    return columns.get('orderDetailURL')
  }
}

module.exports = Order
