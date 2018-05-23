# MeLi Manager
Handle Mercadolibre events, synchronize data with Google Spredsheets.
- [ ] Figure out wormholes
  - [ ] Call @arfon
## Features:
- [x] Store Orders in Google Spreadsheet.
- [x] Bulk-store historical orders data.
  - [x] Exclude self-account purchases
  - [x] Calculate  proper 'FormaEntrega' + 'Estado de venta' + 'FormaPago' state values.
- [x] Handle new Orders notifications, update data in realtime.
- [x] Multi-account support.
- [ ] Store Customers data in Google Spreadsheet.
- [ ] Manage Questions and Messages.

## Maybe:
- Discount Mercadolibre charges from item price? Distinguish sale price
 from actual margin price?
- Store payment method? (useful for when they pick 'ticket' (aka. pagofacil))
