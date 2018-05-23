class Customer {
  // TODO implement.
  static buildFromMeliOrder(buyer) {
    const customer = new Customer()
    customer.firstName = buyer.first_name
    customer.lastName = buyer.last_name
    // Customer.
  }
}

module.exports = Customer
