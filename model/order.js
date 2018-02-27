const moment = require("moment");

const columns = new Map([
    ['dateCreated',             {header: 'FechaVenta',                        column: "fechaventa",         colPos: 1   }],
    ['timeCreated',             {header: 'Hora',                              column: "hora",               colPos: 2   }],
    ['buyerNicknameHyperlink',  {header: 'Cliente',                           column: "cliente",            colPos: 3   }],
    ['itemHyperlink',           {header: 'Item / Descripcion',                column: "itemdescripcion",    colPos: 4   }],
    ['itemQuantity',            {header: 'Cantidad',                          column: "cantidad",           colPos: 5   }],
    ['itemUnitPrice',           {header: 'Precio',                            column: "precio",             colPos: 6   }],
    ['orderDetailURL',          {header: 'Link',                              column: "link",               colPos: 7   }],
    ['sellerNickname',          {header: 'Vendedor',                          column: "vendedor",           colPos: 8   }],
    ['paymentType',             {header: 'FormaPago', default: 'MP',          column: "formapago",          colPos: 9   }],
    ['shipmentType',            {header: 'FormaEntrega',                      column: "formaentrega",       colPos: 10  }],
    ['status',                  {header: 'Estado de venta', default: 'Nueva', column: "estadodeventa",      colPos: 11  }],
    ['comments',                {header: 'Comentarios', default: '',          column: "comentarios",        colPos: 12  }],
]);

const updatableColumns = ['paymentType', 'shipmentType', 'status'];

class Order {

    /**
     *
     * @param meliOrderJson
     * @returns {Order}
     */
    static buildFromMeliOrder(meliOrderJson) {
        let order = new Order();
        order.dateCreated = moment(meliOrderJson.date_closed).format("DD/MMM/YYYY");
        order.timeCreated = moment(meliOrderJson.date_closed).format("hh:mm");
        order.buyerNicknameHyperlink = this._buyerProfileToHyperlink(meliOrderJson.buyer);
        order.itemQuantity = meliOrderJson.order_items[0].quantity;
        order.itemUnitPrice = meliOrderJson.order_items[0].unit_price; //TODO descontar comi + cargo envio gratis. discriminar?
        order.orderDetailURL = `https://myaccount.mercadolibre.com.ar/sales/${meliOrderJson.id}/detail`;
        order.sellerNickname = meliOrderJson.seller.nickname;
        order.paymentType = this._getPaymentType(meliOrderJson);
        order.paymentMethod = this._getPaymentMethod(meliOrderJson);
        order.shipmentType = this._getDeliveryType(meliOrderJson);
        order.status = this._getOrderStatus(meliOrderJson);
        order.comments = '';
        order.itemHyperlink = this._itemToHyperlink(meliOrderJson.order_items[0].item);
        order.itemTitle = meliOrderJson.order_items[0].item.title;
        order.itemId = meliOrderJson.order_items[0].item.id;
        order.buyer = meliOrderJson.buyer;
        order.id = meliOrderJson.id;

        return order;
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
        let base = "http://articulo.mercadolibre.com.ar/";
        let idstr = `${id.substring(0, 3)}-${id.substring(3)}-`;
        let titlestr = title.toLowerCase().split(" ").join("-");
        let end = '-_JM';
        let url = base + idstr + titlestr + end;
        return `=HYPERLINK("${url}","${title}")`;
    }

    /**
     * Convert buyer profile to it's nickname spreadsheets hyperlink.
     *
     * @param nickname
     * @returns {string}
     * @private
     */
    static _buyerProfileToHyperlink({nickname}) {
        let base = "https://perfil.mercadolibre.com.ar/";
        let url = base + nickname;
        let title = nickname;
        return `=HYPERLINK("${url}","${title}")`;
    }

    /**
     * Convert Order to an array of values, ordered to be correctly placed as a row.
     *
     * @returns {Array}
     */
    toRowArray({update}={}) {
        // map Order properties to array values, in columns order.
        let orderRow = Array.from(columns.keys())
            .map((key) => {
                return (this.hasOwnProperty(key) && (!update || updatableColumns.includes(key))) ? this[key] : null
            });

        return orderRow;
    }

    static _getOrderStatus(meliOrderJSON) {
        let {status, payments, shipping, feedback, date_closed} = meliOrderJSON;
        const orderStatus = {
            RESERVED: "Reservada",
            CANCELLED: "Cancelada",
            CANCELLED_QUESTION: "Cancelada?",
            SHIPPED: "Enviada",
            DELIVERED: "Entregada",
            DELIVERED_EXPIRED: "Entregada Vencida",
            UNKNOWN: "DESCONOCIDO"
        };
        const pendingDeliveryStatuses = ["to_be_agreed", "ready_to_ship", "pending"];

        // Se pago y se acuerda entrega ==> "reservado"
        if (status === "paid" && pendingDeliveryStatuses.contains(shipping.status) && (feedback.purchase === null && feedback.sale === null)) {
            return orderStatus.RESERVED;
        }

        if (status === "paid" && shipping.status === "to_be_agreed" && (feedback.sale !== null && feedback.sale.fulfilled)) {
            return orderStatus.DELIVERED;
        }


        // Se pagó, se envio y se entrego ==> "entregado"
        if (status === "paid" && shipping.status === "delivered") {
            return orderStatus.DELIVERED;
        }

        // Al menos uno califico como entregado ==> "entregado"
        if (((feedback.purchase !== null && feedback.purchase.fulfilled) ||
            (feedback.sale !== null && feedback.sale.fulfilled))
        ) {
            return orderStatus.DELIVERED;
        }

        // Se confirmo la compra (no esta "paid") y los pagos estan todos "refunded" ==> "cancelada"
        if (status === "confirmed" && payments.length && payments.every((p) => p.status === "refunded" || p.status === "rejected")) {
            return orderStatus.CANCELLED;
        }

        if (status === "confirmed" &&
            ((feedback.purchase === null) ||
            (feedback.sale !== null && !feedback.sale.fulfilled))
        ) {
            return orderStatus.CANCELLED_QUESTION;
        }

        // Se confirmo la compra (no esta "paid") pero alguien califico no concretado
        if (status === "confirmed" &&
            ((feedback.purchase !== null && !feedback.purchase.fulfilled) &&
            (feedback.sale !== null && !feedback.sale.fulfilled))
        ) {
            return orderStatus.CANCELLED;
        }

        if (status === "paid" && shipping.status === "to_be_agreed" && (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21)) {
            // Pago: "MP"
            return orderStatus.DELIVERED_EXPIRED;
        }
        // se confirmo la compra (no esta "paid"), y pasaron 21 dias ==> "entregada"
        if (status === "confirmed" && (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21)) {
            // Pago: "efectivo"
            return orderStatus.DELIVERED_EXPIRED;
        }

        if (shipping.shipment_type === "shipping" && shipping.status === "shipped") {
            return orderStatus.SHIPPED;
        }

        console.log("Unknown orderStatus for order: ", meliOrderJSON);
        return orderStatus.UNKNOWN
    }

    static _getDeliveryType(meliOrderJSON) {
        let {shipping} = meliOrderJSON;
        const deliveryType = {
            AGREED: "Retiro",
            ME2: "Envio: MercadoEnvios",
            OTHER: "Envio: Otro",
            UNKNOWN: "DESCONOCIDO"
        };

        // No hay 'shipment_type' y en status 'to_be_agreed' => "Retiro"
        if (shipping.shipment_type === null && shipping.status === "to_be_agreed") {
            return deliveryType.AGREED;
        }

        // Tipo "shipping" , y modo "me2" => "Mercadoenvios"
        if (shipping.shipment_type === "shipping" && shipping.shipping_mode === "me2") {
            return deliveryType.ME2;
        }

        // Tipo "shipping", y otro modo => "envio: otro"
        if (shipping.shipment_type === "shipping" && shipping.shipping_mode !== "me2") {
            return deliveryType.OTHER;
        }

        console.log("Unknown deliveryType for order: ", meliOrderJSON);
        return deliveryType.UNKNOWN
    }

    static _getPaymentType(meliOrderJSON) {
        let {status, payments, shipping, date_closed, feedback} = meliOrderJSON;

        const paymentType = {
            CANCELLED: "Cancelado",
            MP: "MP",
            MP_PENDING: "MP Pendiente",
            CASH: "Efectivo",
            UNKNOWN: null
        };

        // se reintegraron los pagos, o alguno califico NO concretado => "Cancelado"
        if (status === "confirmed" && (
                payments.length && payments.every((p) => p.status === "refunded" || p.status === "rejected") ||
                ((feedback.purchase !== null && !feedback.purchase.fulfilled) ||
                (feedback.sale !== null && !feedback.sale.fulfilled))
            )
        ) {
            return paymentType.CANCELLED;
        }

        // se pago y (pasaron 21 dias o alguno puso concretado)=> MP
        if (status === "paid" &&
            (
                shipping.status === "delivered" ||
                (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21) ||
                (
                    (feedback.purchase !== null && feedback.purchase.fulfilled) ||
                    (feedback.sale !== null && feedback.sale.fulfilled)
                )
            )
        ) {
            return paymentType.MP;
        }

        // No esta pago, y alguno puso concretado => Cash
        if (status === "confirmed" && (
            (feedback.purchase !== null && feedback.purchase.fulfilled) ||
            (feedback.sale !== null && feedback.sale.fulfilled))
        ) {
            return paymentType.CASH;
        }

        if (status === "confirmed" && shipping.shipment_type !== "shipping" && (Math.abs(moment(date_closed).diff(new Date(), 'days')) > 21)) {
            return paymentType.UNKNOWN;
        }

        if (status === "paid" && payments.length && payments.some((p) => p.status === "approved")) {
            return paymentType.MP_PENDING;
        }

        return paymentType.UNKNOWN;
    }

    static _getPaymentMethod(meliOrderJson) {
        let {payments} = meliOrderJson;
        if (!payments || !payments.length) {
            return null;
        }
        let accreditedPayments = payments.filter(p => p.status_detail === "accredited");

        if (accreditedPayments.length === 0) {
            return null;
        }
        return accreditedPayments[0].payment_type;
    }
    
    static extractIdFromCellValue(orderDetailURL) {
        let orderIdMatches = orderDetailURL.match(/\d+/);
        if (!(orderIdMatches && orderIdMatches.length)) {
            // not a mercadolibre order!
            return null;
        }
        return Number(orderIdMatches[0]);
    }

    static getColumns() {
        return columns;
    }

    static getIdColumn() {
        return columns.get('orderDetailURL');
    }
}

module.exports = Order;