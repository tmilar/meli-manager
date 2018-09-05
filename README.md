# MeLi Manager

[![Greenkeeper badge](https://badges.greenkeeper.io/tmilar/meli-manager.svg)](https://greenkeeper.io/)

Node.js + MercadoLibre API + Google SpreadSheets API = :tada:

## Table of Contents

<!-- toc -->

- [About](#about)
  * [Features](#features)
  * [Soon](#soon)
  * [Planned](#planned)
- [Usage](#usage)
  * [Requirements](#requirements)
  * [First time Setup](#first-time-setup)
  * [Run](#run)
  * [Test](#test)
  * [Misc](#misc)
    + [MercadoLibre test account creation](#mercadolibre-test-account-creation)
    + [How to: configure Spreadsheet API keys](#how-to-configure-spreadsheet-api-keys)
- [Contributing](#contributing)

<!-- tocstop -->

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
* [Node.js 8+](https://nodejs.org/es/download/)
* [MongoDB 3.4+](https://www.mongodb.com/download-center#community)
* MercadoLibre API [client keys](https://developers.mercadolibre.com.ar/apps/create-app) ([more info](https://developers.mercadolibre.com/en_us/register-your-application))
* Google Spreadsheet API [client keys](https://cloud.google.com/docs/authentication/api-keys)

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
Ensure Mongo DB instance is running (specified in `.env` file). Then:
```
npm start
```

### Test
Ensure test Mongo DB instance is running (specified in `.env.test` file). Then:
```
npm test
```
### Misc

#### MercadoLibre test account creation
A command line utility to locally create, authorize and store a MeLi test user account has been provided.

1. Ensure `.env.test` file exists similar to `.env` for test env variables.
2. Ensure the configured Mongo DB instance is running.
3. Then:
```
node bin/meli-test-account --user=DEV_ACCOUNT_USERNAME
```

Where `DEV_ACCOUNT_USERNAME` is the Dev account that will request the test user.
If `--user=` (or equivalent `-u=`) flag is not specified, will try to find it in environment variable `DEV_ACCOUNT_USERNAME`.

#### How to: configure Spreadsheet API keys
```
{{ TODO: complete }}
```

## Contributing
- Create a new GitHub issue.
- Submit a Pull Request.
- All suggestions welcome!
