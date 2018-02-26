const Promise = require('bluebird');
const GoogleSpreadsheet = require('google-spreadsheet');


class SheetsHelper {

    /**
     * Get authorized access to a specified spreadsheet, with proper credentials.
     *
     * @param credentials
     * @param spreadsheetsKey
     * @param sheetName
     * @param headerRowHeight - specify the header row height. Default 1.
     * @returns {Promise.<T>}
     */
    async setupSheet({credentials, spreadsheetsKey, sheetName}, headerRowHeight = 1) {
        // Create a document object using the ID of the spreadsheet - obtained from its URL.
        this.googleSpreadsheet = Promise.promisifyAll(new GoogleSpreadsheet(spreadsheetsKey));
        this.headerRowHeight = headerRowHeight;

        // Authenticate with the Google Spreadsheets API.
        await this.googleSpreadsheet.useServiceAccountAuthAsync(credentials);

        let info = await this.getInfoAboutSpreadsheet();
        console.log(`\x1b[34mLoaded document: \x1b[35m${info.title}\nInfo:`, info, JSON.parse(JSON.stringify(info)));

        this.sheet = this.googleSpreadsheet.worksheets.find(sheet => sheet.title === sheetName);

        if(!this.sheet) throw new Error(`Sheet ${sheetName} not found for sheet key ${spreadsheetsKey}.`);
    }

    async getInfoAboutSpreadsheet() {
        return await this.googleSpreadsheet.getInfoAsync();
    }

    /**
     * get next row position to write.     *
     *
     * @returns {Promise.<*>}
     */
    async getNextEmptyRowPosition() {
        let rows = await this.getAllRows();
        let newRowPosition = rows.length + this.headerRowHeight + 1;
        return newRowPosition;
    }

    /**
     * Read all rows from sheet.
     *
     * @returns {Promise.<*>}
     */
    async getAllRows() {
        let getRows = Promise.promisify(this.sheet.getRows);
        return await getRows({offset: this.headerRowHeight});
    }

    /**
     * Make sure there is enough row space for new rows.
     * @param nextRowPosition
     * @returns {Promise.<void>}
     */
    async ensureSheetSpace(nextRowPosition) {
        let resize = Promise.promisify(this.sheet.resize);
        const EXTRA_RESIZE_ROWS = 4;
        if (nextRowPosition > this.sheet.rowCount) {
            await resize({rowCount: this.sheet.rowCount + EXTRA_RESIZE_ROWS});
            console.log(
                `Added ${EXTRA_RESIZE_ROWS} rows in order to write row ${nextRowPosition} (new row count: ${this.sheet.rowCount + EXTRA_RESIZE_ROWS}, previous: ${sheet.rowCount}).`
            );
        }
    }

    /**
     * Write row values, cell-by-cell, to keep functions and other spreadsheets special values.
     *
     * @param rowValues
     * @param rowNumber
     * @returns {Promise.<void>}
     */
    async setRowValuesInRowCells(rowValues, rowNumber) {
        // promisify
        let getCells = Promise.promisify(this.sheet.getCells);

        // build order row
        let cells = await getCells({
            'min-row': rowNumber,
            'max-row': rowNumber,
            'return-empty': true
        });

        await Promise.map(rowValues, ((cellValue, i) => {
            let setCellValue = Promise.promisify(cells[i].setValue);
            return setCellValue(cellValue)
                .then(() => console.log(`Cell (${rowNumber}, ${i}) written value: ${cellValue}.`))
        }))
            .then(() => console.log(`Written row ${rowNumber} with ${rowValues.length} cells.`));
    }

    async checkValidRow(rowPosition) {
        if (rowPosition > await this.getNextEmptyRowPosition()) {
            throw new Error(`Row ${rowPosition} is not valid!`);
        }
    }

}


module.exports = SheetsHelper;