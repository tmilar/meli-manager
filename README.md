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
  * [API docs](#api-docs)
    + [Authorize MercadoLibre Account](#authorize-mercadolibre-account)
    + [MercadoLibre notifications listener](#mercadolibre-notifications-listener)
    + [Get MercadoLibre Orders](#get-mercadolibre-orders)
        * [URL Params](#url-params)
    + [Get MercadoLibre Questions](#get-mercadolibre-questions)
        * [URL Params](#url-params-1)
    + [Answer Mercadolibre Question](#answer-mercadolibre-question)
        * [URL Params](#url-params-2)
        * [Body Params](#body-params)
  * [Misc](#misc)
    + [MercadoLibre Test Accounts CLI tool](#mercadolibre-test-accounts-cli-tool)
    + [Google Spreadsheet API Keys Setup](#google-spreadsheet-api-keys-setup)
- [Deploy to Now](#deploy-to-now)
  * [Setup & Config](#setup--config)
  * [Deploy](#deploy)
- [Contributing](#contributing)

<!-- tocstop -->

## About
Meli Manager is a set of tools to help small and medium sized sellers of MercadoLibre manage their operations in an easy, scalable, and more time/cost effective way in comparison to official MercadoLibre UI.

### Features
- [x] Synchronize Orders with Google Spreadsheet
- [x] Real time synchronization support.
- [x] Multi-account support.
- [x] Simplify order status information (delivery and payment statuses).
- [x] Manage customer Questions.

### Soon
- [ ] Manage customer Messages.
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
* Google Spreadsheet API [client keys](https://cloud.google.com/docs/authentication/api-keys) (see [setup steps](#google-spreadsheet-api-keys-setup))

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
# Orders sheet name (ie. 'Sheet 1', 'Ventas'...)
ORDERS_SPREADSHEET_SHEETNAME=

# Google Spreadsheet document ID where to store MeLi Questions
QUESTIONS_SPREADSHEET_ID=
# Questions sheet name (ie. 'Sheet 1', 'Ventas'...)
QUESTIONS_SPREADSHEET_SHEETNAME=
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


### API docs

#### Authorize MercadoLibre Account

```
GET /auth/mercadolibre
```
Run MercadoLibre account authorization flow.
On success, account tokens and relevant profile info will be stored in the DB, and will be available for the other endpoints.

#### MercadoLibre notifications listener

```
POST /notification
{
    "resource": "/orders/1499111111",
    "user_id": 33687004,
    "topic": "orders",
    "application_id": 2069392825111111,
    "attempts": 1,
    "sent": "2017-10-09T13:58:23.347Z",
    "received": "2017-10-09T13:58:23.329Z"
}
```
This endpoint is used for listening notifications sent by the Mercadolibre application.
MercadoLibre will send a notification each time a resource of the registered 'topics' is updated.
Some of the currently registered topics are 'questions' and 'orders_v2'.


#### Get MercadoLibre Orders
```
GET /order
```
Retrieve all MercadoLibre orders of the available accounts.

###### URL Params

All params are *optional*:

| Param | Type | Example | Description |
|---|---|---|---|
| start | String | 01-01-19 | Start date filter (format "DD-MM-YY"). Inclusive. |
| end | String | 31-01-19 | End date filter (format "DD-MM-YY"). Inclusive. |
| accounts | String | "MELI USER1,MELI USER2" | Retrieve orders only from selected account usernames. |
| store | Boolean | true, false| Wether to store retrieved orders in the configured spreadsheet. |

#### Get MercadoLibre Questions

```
GET /question
```

Retrieve all MercadoLibre questions of the available accounts.

###### URL Params

All params are *optional*:

| Param | Type | Example | Description |
|---|---|---|---|
| start | String | 01-01-19 | Start date filter (format "DD-MM-YY"). Inclusive. |
| end | String | 31-01-19 | End date filter (format "DD-MM-YY"). Inclusive. |
| accounts | String | "MELI USER1,MELI USER2" | Retrieve questions only from selected account usernames. |
| store | Boolean | true, false| Wether to store retrieved questions in the configured spreadsheet. |

#### Answer Mercadolibre Question

```
POST /question/{id}/answer
{
    "sellerId": 123456,
    "answerText": "Hola, esta en stock! Saludos."
}
```

###### URL Params

All params are *required*.

| Param | Type | Example | Description |
|---|---|---|---|
| id | Number | 111111111 | ID of the MercadoLibre Question to answer. |


###### Body Params

All params are *required*.

| Param  | Type | Example | Description |
|---|---|---|---|
| sellerId | Number | 12121212 | ID of MercadoLibre seller account. Requires account to be authorized. |
| answerText | String | "answer text" | Text of the answer to be sent for the selected question |

### Misc

#### MercadoLibre Test Accounts CLI tool
An optional command line utility to locally create, authorize and store a MeLi test user account is provided.

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
3. Run it. For example:

```
$ npm run meli:test-account 
Usage: cli-meli-accounts [options]

Welcome!
? What do you want to do? (Use arrow keys)
> Create a new Test account
  Login & Save existing account
  List saved accounts
  ──────────────
  Exit
```


#### Google Spreadsheet API Keys Setup

To write to your own spreadsheet you need to set up “Service Account Keys”. Follow these steps:

1. Go to [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)

2. Click on “Create credentials”; choose “Service account key”

3. Select JSON when it asks you how to download the key.

4. The service account key you have just generated includes a client_email. Navigate to your google spreadsheet that will hold the data and allow the client_email to have Write access on the document.

5. With the downloaded JSON data, now you have to fill in the properties in the .env variables:

    ```
        SPREADSHEET_PRIVATE_KEY_ID=<private_key_id>
        SPREADSHEET_PRIVATE_KEY=<private_key>
        SPREADSHEET_CLIENT_EMAIL=<client_email>
        SPREADSHEET_CLIENT_ID=<client_id>
    ```

    > _Note_: the rest of the JSON properties are already set by default in the [`config/index.js`](../master/config/index.js) file.

6. For this specific project, we'll also need the document Id and Sheet Name where we'll save the MercadoLibre Orders data:

    > The spreadsheet id can be found in the document URL. For example, in:
    > "<https://docs.google.com/spreadsheets/d/1k0ip0Zvr9g9fXEnkLzNHs_recXFjTAlOFQ19nNdi4Tw/edit#gid=0>"
    > the spreadsheet Id is: __1k0ip0Zvr9g9fXEnkLzNHs_recXFjTAlOFQ19nNdi4Tw__

    ```
        ORDERS_SPREADSHEET_ID=
    ```

    > The SHEETNAME is the literal name of the sheet to be used.
    > Usually defaults to "Sheet 1", but can be otherwise.

    ```
        ORDERS_SPREADSHEET_SHEETNAME=
    ```

7. Repeat step (6) for Questions sheet, if you'd like.

    ```
        QUESTIONS_SPREADSHEET_ID=
    ```
    ```
        QUESTIONS_SPREADSHEET_SHEETNAME=
    ```


## Deploy to Now

Deploying is easy!

### Setup & Config
1) Make sure [Now client](https://zeit.co/download) is installed.
2) Configure app secrets:
```
now secret add meli-manager-meli_client_secret "my_meli_client_secret"
now secret add meli-manager-mongodb_url "my_mongodb_url"
now secret add meli-manager-spreadsheet_private_key_id "my_spreadsheet_private_key_id"
now secret add meli-manager-spreadsheet_private_key "my_spreadsheet_private_key"
```
_Note:_ the spreadsheet private key might be trickier to add to Now, due to it's multiline complexity.
A [workaround](https://github.com/zeit/now-cli/issues/749#issuecomment-496674978) is saving the key text in a clean file, and then run instead:
```
now secret add meli-manager-spreadsheet_private_key -- "`< google-secret-key`"
```

3) Edit [`now.json`](./now.json) file `env` variables as you seem fit for your instance.

### Deploy

Simply run:
```
now
```
And in a few moments you'll see the URL of your running instance. See the [now docs](https://zeit.co/docs/v2/getting-started/introduction-to-now/) for more deployment options.

## Contributing
- Create a new GitHub issue.
- Submit a Pull Request.
- All suggestions welcome!
