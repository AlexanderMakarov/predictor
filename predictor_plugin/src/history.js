// Handles history. Saves in separate sheet, extracts data to predict.
const History =  new function() {
    this.SHEET_NAME = 'PredictorHistory'
    this.DATE_COL = 'date'
    this.DEFAULT_COLUMNS = ["token", "y", "date"]

    /**
     * Saves current sheet into history (existing).
     * @param {Date} date Date to save current history on. 
     */
    this.saveHistory = function(date) {
        const startTime = new Date();
        const headers = getHeaders(SpreadsheetApp.getActiveSheet());
        const historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.SHEET_NAME);
        let values = getSheetAllValues(SpreadsheetApp.getActiveSheet(), !!headers);

        // Take out data to save into history.
        if (checkEts(headers)) {

            // Compare with existing history and add only difference without date. 4th column is 'date'.
            const lastDayInHistory = historySheet.getRange(historySheet.getLastRow(), 4, 1, 1)
            values = values.filter(item => isRowNotEmpty(item) && row[3] > lastDayInHistory);
        } else {

            // Add all for specified date or today. Add 'date' column values.
            const dateToSet = !date ? new Date(new Date().toDateString()) : date; // Trim time.
            values.forEach(row => row.push(dateToSet))
        }

        // Append 'values' to history.
        historySheet.getRange(historySheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
        console.log("saveHistory: appended " + numRows + " rows " + numColumns + " columns into history in "
                + humanDiffWithCurrentDate(startTime) + ".")
    }

    /**
     * Sends history to ML engine and updates current sheet with results.
     */
    this.predictAndUpdateCurrentSheet = function() {
        const startTime = new Date();
        const historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.SHEET_NAME);
        const headers = getHeaders(historySheet)
        const history = historySheet.getRange(2, 1, historySheet.getLastRow(), historySheet.getLastColumn()).getValues()
                .filter(item => isRowNotEmpty(item));
        const isEts = checkEts(headers);
        let prediction = predictDay(history, headers, new Date());// TODO ask day to predict.

        // Update current sheet.
        const currentSheet = SpreadsheetApp.getActiveSheet();
        if (isEts) {
            currentSheet.getRange(currentSheet.getLastRow() + 3, 1, prediction.length, prediction[0].length)
                    .setValues(prediction);
        } else {
            if (getHeaders(currentSheet)) { // If current sheet have headers then keep them but from history.
                prediction = headers + prediction;
            }
            currentSheet.clear(); // Predicted date size may be less than existing.
            currentSheet.getRange(1, 1, prediction.length, prediction[0].length).setValues(prediction);
        }
        console.log("predictAndUpdateCurrentSheet: predicted " + prediction.length + " rows in "
                + humanDiffWithCurrentDate(startTime) + ".")
    }

    /**
     * Creates and fills history sheet. Does nothing if it exists already.
     */
    this.initialize = function() {
        let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.SHEET_NAME);
        if (!historySheet) {
            const startTime = new Date();
            const currentSheet = SpreadsheetApp.getActiveSheet();
            const headersCurrentSheet = getHeaders(currentSheet);
            let filteredSheets = [currentSheet]; // By-default "ETS" mode.
            const isEts = checkEts(headersCurrentSheet);
            if (!isEts) {
                filteredSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets()
                        .filter(sheet => isValidSheetForInitialLoad(sheet.getName(), currentSheet.getName()));
            }
            historySheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
            historySheet.setName(History.SHEET_NAME);
    
            if (filteredSheets.length > 0) {
                const headers = getHeaders(filteredSheets[0]);
                if (!headers) {
                    headers = History.DEFAULT_COLUMNS;
                } else if (isEts) {
                    headers.push(this.DATE_COL);
                }
                historySheet.appendRow(headers);
                filteredSheets.forEach(sheet => {
                    let date = getParsableDate(sheet.getName());
                    let values = getSheetAllValues(sheet, !!headers)
                    if (!isEts) {
                        values.forEach(row => row.push(date));
                    }
                    historySheet.getRange(historySheet.getLastRow() + 1, 1, values.length, values[0].length)
                            .setValues(values);
                    console.log("initialize: added " + values.length + " rows into history from sheet '"
                            + sheet.getName() + "'.")
                });
            }
            console.log("initialize: parsed " + filteredSheets.length + " sheets into history in "
                    + humanDiffWithCurrentDate(startTime) + ".")
        }
    }

    function checkEts(headers) {
        return headers && headers.map(h => h.toLowerCase()).toString() == ETS_COLUMNS.toString();
    }

    function getParsableDate(date) {
        return date.replaceAll(".", "/").replaceAll("\\", "/");
    }

    function isDate(date) {
        const convertedDate = new Date(date);
        return (convertedDate !== "Invalid Date") && !isNaN(convertedDate);
    }

    function isValidSheetForInitialLoad(sheetName, nameToIgnore) {
        return sheetName != nameToIgnore && isDate(getParsableDate(sheetName));
    }

    /**
     * Tries to extract headers from provided sheet.
     * @param {Sheet} sheet Sheet to search header in.
     * @returns Array of column names in order or `null` if header is not found.
     */
    function getHeaders(sheet) {
        if (sheet) {
            const firstRow = sheet.getRange(1, 1, 1, sheet.getDataRange().getNumColumns()).getValues()[0];
            if (firstRow && firstRow.every(x => isNaN(x))) {
                return firstRow;
            }
        }
        return null;
    }

    function getSheetAllValues(sheet, isSkipHeader) {
        const numRows = sheet.getDataRange().getNumRows();
        const numColumns = sheet.getDataRange().getNumColumns();
        return sheet.getRange(isSkipHeader ? 2 : 1, 1, numRows, numColumns).getValues()
                .filter(item => isRowNotEmpty(item));
    }

    /**
     * Sends provided data to prediction engine and returns response. Performs required mapping.
     * @param {Array} values 2D array of values from history.
     * @param {Array} headers Arrays of headers for values.
     * @param {Date} date Day to predict.
     * @returns Array of predicted values in order of headers.
     */
    function predictDay(values, headers, date) {
        const startTime = new Date(); // TODO maybe use 2D array and headers separately.
        const keys = Object.keys(values[0]); // Headers are the same in all rows.
        const tokenizer = new Tokenizer(values, headers);
        const historiesPerToken = tokenizer.getTokenHistories(Period.WEEKLY) // TODO remove period
        // console.log(historiesPerToken)
        const result = Predict.predict(historiesPerToken, tokenizer, date)
        console.log("predictToday: got " + prediction.length + " rows in "
                + humanDiffWithCurrentDate(startTime) + ".")
        console.log("predictToday: completed " + result.length + " rows in "
                + humanDiffWithCurrentDate(startTime) + ".")
        return result;
    }

    function isRowNotEmpty(row) {
        return !!row && row.every(x => !!x);
    }

    function humanDiffWithCurrentDate(startTime) {
        return Math.round(new Date() - startTime) + " ms";
    }
}
