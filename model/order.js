const moment = require("moment");

class Order {

    /**
     *
     * @param meliOrderJson
     * @returns {Order}
     */
    static buildFromMeliOrder(meliOrderJson) {
        let order = new Order();
        order.dateCreated = moment(meliOrderJson.date_created).format("DD/MMM/YYYY");
        order.timeCreated = moment(meliOrderJson.date_created).format("hh:mm");
        order.buyerNicknameHyperlink = this._buyerProfileToHyperlink(meliOrderJson.buyer);
        order.itemQuantity = meliOrderJson.order_items[0].quantity;
        order.itemUnitPrice = meliOrderJson.order_items[0].unit_price;
        order.orderDetailURL = `https://myaccount.mercadolibre.com.ar/sales/${meliOrderJson.id}/detail`;
        order.sellerNickname = meliOrderJson.seller.nickname;
        order.paymentType = 'MP';
        order.shipmentType = meliOrderJson.shipping.shipment_type; //TODO convert to actual FormaEntrega
        order.status = 'Reservada';
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
        let base  = "http://articulo.mercadolibre.com.ar/";
        let idstr = `${id.substring(0,3)}-${id.substring(3)}-`;
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
    toRowArray() {
        const columns = new Map([
            ['dateCreated',             {header: 'FechaVenta'                         ,column: "fechaventa",      meliPath: ''                             }],
            ['timeCreated',             {header: 'Hora'                               ,column: "hora",            meliPath: ''                       }],
            ['buyerNicknameHyperlink',  {header: 'Cliente'                            ,column: "cliente",         meliPath: 'buyer.nickname'                          }],
            ['itemHyperlink',           {header: 'Item / Descripcion'                 ,column: "itemdescripcion", meliPath: 'order_items[0].item.title'                                  }],
            ['itemQuantity',            {header: 'Cantidad'                           ,column: "cantidad",        meliPath: 'order_items[0].quantity'                           }],
            ['itemUnitPrice',           {header: 'Precio'                             ,column: "precio",          meliPath: 'order_items[0].unit_price'                         }],
            ['orderDetailURL',          {header: 'Link'                               ,column: "link",            meliPath: ''                       }],
            ['sellerNickname',          {header: 'Vendedor'                           ,column: "vendedor",        meliPath: 'seller.nickname'                           }],
            ['paymentType',             {header: 'FormaPago', default: 'MP'           ,column: "formapago",       meliPath: ''                            }],
            ['shipmentType',            {header: 'FormaEntrega'                       ,column: "formaentrega",    meliPath: 'shipping.shipment_type'                               }],
            ['status',                  {header: 'Estado de venta', default: 'Nueva'  ,column: "estadodeventa",   meliPath: ''                                }],
            ['comments',                {header: 'Comentarios',     default: ''       ,column: "comentarios",     meliPath: ''                              }],
            ['id',                      {} ],
        ]);

        // map Order properties to array values, in columns order.
        let orderRow = Array.from(columns.keys())
            .map((key) => this.hasOwnProperty(key) ? this[key] : '');

        return orderRow;
    }
}

module.exports = Order;