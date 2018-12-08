const Promise = require('bluebird')
const GoogleSpreadsheet = require('google-spreadsheet')

class SheetsHelper {
  /**
   * Get authorized access to a specified spreadsheet, with proper credentials.
   *
   * @param {*} credentials - google service credentials
   * @param {string} spreadsheetsKey - the spreadsheet doc id
   * @param {string} sheetName - the specific sheet of the doc to use
   * @param {number} headerRowHeight - the header row height. Default 1.
   * @param {number} headerRowWidth - limit the header row width. Default 13.
   *
   * @returns {Promise.<T>} - sheet auth promise
   */
  async setupSheet({credentials, spreadsheetsKey, sheetName, headerRowHeight = 1, headerRowWidth = 13}) {
    // Create a document object using the ID of the spreadsheet - obtained from its URL.
    this.googleSpreadsheet = Promise.promisifyAll(new GoogleSpreadsheet(spreadsheetsKey))
    this.headerRowHeight = headerRowHeight
    this.headerRowWidth = headerRowWidth

    // Authenticate with the Google Spreadsheets API.
    await this.googleSpreadsheet.useServiceAccountAuthAsync(credentials)

    const info = await this.getInfoAboutSpreadsheet()
    console.log(`\u001B[34mLoaded document: \u001B[35m${info.title} - \u001B[34mSheet name: \u001B[35m${sheetName}`)

    this.sheet = this.googleSpreadsheet.worksheets.find(sheet => sheet.title === sheetName)

    if (!this.sheet) {
      throw new Error(`Sheet ${sheetName} not found for sheet key ${spreadsheetsKey}.`)
    }
  }

  async getInfoAboutSpreadsheet() {
    return this.googleSpreadsheet.getInfoAsync()
  }

  /**
   * Get next row position to write.
   *
   * @returns {Promise.<number>} - next row position promise
   */
  async getNextEmptyRowPosition() {
    const rows = await this.getAllRows()
    const newRowPosition = rows.length + this.headerRowHeight + 1
    return newRowPosition
  }

  /**
   * Read all rows from sheet.
   *
   * @returns {Promise.<[*]>} - array of sheet rows promise
   */
  async getAllRows() {
    const getRows = Promise.promisify(this.sheet.getRows)
    return getRows({offset: this.headerRowHeight})
  }

  /**
   * Make sure there is enough row space for new rows.
   * Add extra rows if needed.
   *
   * @param {number} nextRowPosition - define the next desired row position to be checked
   * @returns {Promise.<void>} - execution promise
   */
  async ensureSheetSpace(nextRowPosition) {
    const resize = Promise.promisify(this.sheet.resize)
    const EXTRA_RESIZE_ROWS = 4
    if (nextRowPosition > this.sheet.rowCount) {
      await resize({rowCount: this.sheet.rowCount + EXTRA_RESIZE_ROWS})
      console.log(
        `Added ${EXTRA_RESIZE_ROWS} rows in order to write row ${nextRowPosition} (new row count: ${this.sheet.rowCount + EXTRA_RESIZE_ROWS}, previous: ${this.sheet.rowCount}).`
      )
    }
  }

  /**
   * Write row values, cell-by-cell, while keeping functions and other spreadsheets special values.
   *
   * @param {[*]}    rowValues - values to be written in the row
   * @param {number} rowNumber - row number to write
   *
   * @returns {Promise.<void>} - write execution promise
   */
  async setRowValuesInRowCells(rowValues, rowNumber) {
    // Promisify
    const getCells = Promise.promisify(this.sheet.getCells)

    // Build order row
    const cells = await getCells({
      'min-row': rowNumber,
      'max-row': rowNumber,
      'return-empty': true
    })

    await Promise.map(rowValues, (cellValue, i) => {
      if (cellValue === null || cellValue === undefined) {
        return
      }
      const setCellValue = Promise.promisify(cells[i].setValue)
      return setCellValue(cellValue)
        .then(() => console.log(`Cell (${rowNumber}, ${i}) written value: ${cellValue}.`))
    })
      .then(() => console.log(`Written row ${rowNumber} with ${rowValues.length} cells.`))
  }

  async checkValidRow(rowPosition) {
    if (rowPosition > await this.getNextEmptyRowPosition()) {
      throw new Error(`Row ${rowPosition} is not valid!`)
    }
  }

  async getAllCellsByColumn({col}) {
    const getCells = Promise.promisify(this.sheet.getCells)

    const minRowPosition = this.headerRowHeight + 1
    const cells = await getCells({
      'min-row': minRowPosition,
      'return-empty': true,
      'min-col': col,
      'max-col': col
    })

    const values = []
    cells.forEach(cell => {
      // Get values
      const cellValue = cell.formula || cell.value
      const rowIndex = cell.row

      // Write cell
      values[rowIndex] = cellValue
    })

    return values
  }
}

module.exports = SheetsHelper
