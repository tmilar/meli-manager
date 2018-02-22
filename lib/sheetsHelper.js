const Promise = require('bluebird');
const GoogleSpreadsheet = require('google-spreadsheet');


class SheetsHelper {

    /**
     * Get authorized access to a specified spreadsheet, with proper credentials.
     *
     * @param credentials
     * @param spreadsheetsKey
     * @param sheetName
     * @returns {Promise.<T>}
     */
    static async setupSheet({credentials, spreadsheetsKey, sheetName}) {
        // Create a document object using the ID of the spreadsheet - obtained from its URL.
        this.sheet = Promise.promisifyAll(new GoogleSpreadsheet(spreadsheetsKey));

        // Authenticate with the Google Spreadsheets API.
        await this.sheet.useServiceAccountAuthAsync(credentials);

        let info = await this.getInfoAboutSpreadsheet();
        console.log(`\x1b[34mLoaded document: \x1b[35m${info.title}\nInfo:`, info, JSON.parse(JSON.stringify(info)));

        let sheet = this.sheet.worksheets.find(sheet => sheet.title === sheetName);

        if(!sheet) throw new Error(`Sheet ${sheetName} not found for sheet key ${spreadsheetsKey}.`);

        return sheet;
    }

    static async getInfoAboutSpreadsheet() {
        return await this.sheet.getInfoAsync();
    }

    /**
     * get next row position to write.     *
     *
     * @param sheet
     * @param headerRowHeight (default 1), rows to consider for header.
     * @returns {Promise.<*>}
     */
    static async getNextEmptyRowPosition(sheet, headerRowHeight = 1) {
        let getRows = Promise.promisify(sheet.getRows);
        let rows = await getRows({offset: headerRowHeight});
        let newRowPosition = rows.length + headerRowHeight + 1;
        return newRowPosition;
    }

    /**
     * Make sure there is enough row space for new rows.
     * @param sheet
     * @param nextRowPosition
     * @returns {Promise.<void>}
     */
    static async ensureSheetSpace(sheet, nextRowPosition) {
        let resize = Promise.promisify(sheet.resize);
        const EXTRA_RESIZE_ROWS = 4;
        if (nextRowPosition > sheet.rowCount) {
            await resize({rowCount: sheet.rowCount + EXTRA_RESIZE_ROWS});
            console.log(
                `Added ${EXTRA_RESIZE_ROWS} rows in order to write row ${nextRowPosition} (new row count: ${sheet.rowCount + EXTRA_RESIZE_ROWS}, previous: ${sheet.rowCount}).`
            );
        }
    }

    /**
     * Write row values, cell-by-cell, to keep functions and other spreadsheets special values.
     *
     * @param sheet
     * @param rowValues
     * @param rowNumber
     * @returns {Promise.<void>}
     */
    static async setRowValuesInRowCells(sheet, rowValues, rowNumber) {
        // promisify
        let getCells = Promise.promisify(sheet.getCells);

        // build order row
        let cells = await getCells({
            'min-row': rowNumber,
            'max-row': rowNumber,
            'return-empty': true
        });

        await Promise.map(rowValues, ((cellValue, i) => {
            let setCellValue = Promise.promisify(cells[i].setValue);
            return setCellValue(cellValue)
                .then(() => console.log(`Cell (${rowNumber}, ${i}) written value: ${cellValue}.`));
        }))
            .then(() => console.log(`Written row ${rowNumber} with ${rowValues.length} cells.`));
    }

    static async checkValidRow(sheet, rowPosition) {
        if (rowPosition > await this.getNextEmptyRowPosition(sheet)) {
            throw new Error(`Row ${rowPosition} is not valid!`);
        }
    }

}


module.exports = SheetsHelper;