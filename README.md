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
    + [MercadoLibre Test Accounts CLI tool](#mercadolibre-test-accounts-cli-tool)
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

#### MercadoLibre Test Accounts CLI tool
A command line utility to locally create, authorize and store a MeLi test user account is provided.

__How to use__
1. Setup env variables in `bin/cli-meli-accounts` path:
```
$ npm run meli:test-account:setup
```
This will initialize a fresh `bin/cli-meli-accounts/.env` file like this, for you to complete:
```
# Port to use for oauth server. 3001 is suggested.
PORT=3001

# Mongo DB URL where to register/retrieve user Accounts.
MONGODB_URL=

# MercadoLibre Application keys used to create Test accounts & refresh Account access tokens.
MELI_CLIENT_ID=
MELI_CLIENT_SECRET=
```

2. Ensure the configured Mongo DB instance is running.
3. Run it:

```
$ node bin/cli-meli-accounts/ -h
Usage: cli-meli-accounts [options]

Interactive CLI for MercadoLibre user Accounts management.

Options:

  -V, --version          output the version number
  -h, --help             output usage information
```

_Additionaly, it could be run doing_ `npm run meli:test-account`

> example:
>  `node bin/cli-meli-accounts`
> would output:
>
> ```
> Welcome!
> ? What do you want to do? (Use arrow keys)
> > Create a new Test account
>   Login & Register existing account
>   List saved accounts
>   ──────────────
>   Exit
> ```


#### How to: configure Spreadsheet API keys
```
{{ TODO: complete }}
```

## Contributing
- Create a new GitHub issue.
- Submit a Pull Request.
- All suggestions welcome!
