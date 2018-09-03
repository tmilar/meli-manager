# MeLi Manager

[![Greenkeeper badge](https://badges.greenkeeper.io/tmilar/meli-manager.svg)](https://greenkeeper.io/)

Node.js + MercadoLibre API + Google SpreadSheets API = :tada:

## About
Meli Manager is a set of tools to help small and medium sized sellers of MercadoLibre manage their operations in an easy, scalable, and more time/cost effective way in comparison to official MercadoLibre UI.

### Features
- [x] Synchronize Orders with Google Spreadsheet
- [x] Real time synchronization support.
- [x] Multi-account support.
- [x] Simplify order status information (delivery and payment statuses).

### Soon
- [ ] Manage customer Questions and Messages.
- [ ] Synchronize Customers data related to Orders.
- [ ] Build Customers profiles and relate to questions and messages.

### Planned
- [ ] Spreadsheet Aggregated Listings UI - CRUD
- [ ] Catalog Items definition and mapping to Listings

## Usage
### Requirements
* Node.js 8+
* MongoDB 3.4+
* MercadoLibre API client keys
* Google Spreadsheet API client keys

### First time Setup
```
npm install
```

Then, `npm run setup` to initialize .env file. Edit it to fill in the blanks:

```
# Express server port (ie. 3000)
PORT=

# MercadoLibre application credentials
MELI_CLIENT_ID=
MELI_CLIENT_SECRET=

# Google Spreadsheet application credentials
SPREADSHEET_PRIVATE_KEY_ID=
SPREADSHEET_PRIVATE_KEY=
SPREADSHEET_CLIENT_EMAIL=
SPREADSHEET_CLIENT_ID=

# Mongo DB url. (ie. local dev: mongodb://localhost/melimgr)
MONGODB_URL=

# Google Spreadsheet document ID where to store MeLi Orders
ORDERS_SPREADSHEET_ID=
# Google Spreadsheet sheet name (ie. 'Sheet 1', 'Ventas'...)
ORDERS_SPREADSHEET_SHEETNAME=
```
### Run
Ensure Mongo DB instance is running (specified in `.env` file).
```
npm start
```

### Test
Ensure test Mongo DB instance is running (specified in `.env.test` file).
```
npm test
```
### Misc

#### MercadoLibre test account creation
A command line utility to locally create, authorize and store a MeLi test user account has been provided.

1. Ensure `.env.test` file exists similar to `.env` for test env variables.
2. Ensure the configured Mongo DB instance is running.
3. Run:
```
node bin/meli-test-account --user=TEST_ACC_USERNAME
```

Where `TEST_ACC_USERNAME` is the Dev account that will request the test user.
If flag not specified, will try to find it in env var `DEV_ACCOUNT_USERNAME`.

## Contributing
- Create a new GitHub issue.
- Submit a Pull Request.
- All suggestions welcome!
