// Handles history. Saves in separate sheet, extracts data to predict.
const History =  new function() {
    this.SHEET_NAME = 'PredictorHistory'
    this.DATE_COL = 'date'
    this.DEFAULT_COLUMNS = ["token", "y", "date"]

    /**
     * Saves current sheet into history (existing).
     * @param {Date} date Date to save current history on. If not specified uses today.
     */
    this.saveHistory = function(date) {
        const startTime = new Date();
        const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const currentSheet = currentSpreadsheet.getActiveSheet();
        const headers = getHeaders(currentSheet);
        const historySheet = currentSpreadsheet.getSheetByName(History.SHEET_NAME);
        let values = getSheetAllValues(currentSheet, !!headers);
        if (!!undefined) {
            console.log("Can't save '" + values + "' into " + currentSheet + ", doing nothing.");
            return false;
        }

        // Take out data to save into history.
        if (checkEts(headers)) {

            // Compare with existing history and add only difference without date. 4th column is 'date'.
            // TODO support "ETS" mode for all variety of columns.
            const lastDayInHistory = historySheet.getRange(historySheet.getLastRow(), 4, 1, 1);
            values = values.filter(item => isRowNotEmpty(item) && row[3] > lastDayInHistory);
        } else {

            // Add all for specified date or today. Add 'date' column values.
            const dateToSet = !date ? this.getTodayDate() : date; // Trim time.
            values.forEach(row => row.push(dateToSet));
        }

        // Append 'values' to history.
        const numRows = values.length;
        const numColumns = values[0].length;
        historySheet.getRange(historySheet.getLastRow() + 1, 1, numRows, numColumns).setValues(values);
        console.log("saveHistory: appended " + numRows + " rows " + numColumns + " columns into history in "
                + humanDiffWithCurrentDate(startTime) + ".");
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
        const prediction = predictDay(history, headers, new Date());// TODO ask day to predict.

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
        const startTime = new Date();
        const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let historySheet = currentSpreadsheet.getSheetByName(History.SHEET_NAME);
        if (!getHeaders(historySheet)) { // Initialized == History.SHEET_NAME exists && contains headers.
            const currentSheet = currentSpreadsheet.getActiveSheet();
            const currentSheetName = currentSheet.getName();
            if (!historySheet) { // Create history sheet if need.
                historySheet = currentSpreadsheet.insertSheet(History.SHEET_NAME);
                currentSpreadsheet.setActiveSheet(currentSheet); // Don't push user on new sheet.
            }
            const headersCurrentSheet = getHeaders(currentSheet);
            historySheet.appendRow(headersCurrentSheet || History.DEFAULT_COLUMNS);
            const isAppendMode = checkEts(headersCurrentSheet); // Check mode by current sheet only.
            // const sheetsToIterate = [currentSheet].concat(
            //         currentSpreadsheet.getSheets().filter(sheet => sheet.getName() != currentSheet.getName()));
            currentSpreadsheet.getSheets().forEach(sheet => {
                let sheetName = sheet.getName();
                if (sheetName == currentSheetName || sheetName == History.SHEET_NAME) {
                    return;
                }
                if (!isValidSheetForInitialLoad(sheetName)) {
                    console.log("initialize: skipping '" + sheet.getName() + "' sheet as not supported.");
                    return;
                }
                let headers = getHeaders(sheet);
                if (isAppendMode && !checkEts(headers)) {
                    console.log("initialize: skipping '" + sheet.getName()
                            + "' because doesn't have 'Append' mode headers");
                    return;
                }
                let values = getSheetAllValues(sheet, !!headers);
                if (!values) {
                    console.log("initialize: skipping '" + sheet.getName() + "' sheet because it's empty.");
                    return;
                }
                if (!isAppendMode) {
                    let date = getParsableDate(sheetName);
                    values.forEach(row => row.push(date));
                }
                historySheet.getRange(historySheet.getLastRow() + 1, 1, values.length, values[0].length)
                        .setValues(values);
                console.log("initialize: added " + values.length + " rows into history from sheet '"
                        + sheet.getName() + "'.");
            });
        }
        console.log("initialize: initialized history sheet '" + historySheet.getName() + "' in "
                + humanDiffWithCurrentDate(startTime) + ".");
    }

    this.getTodayDate = function() {
        return new Date(new Date().toDateString());
    }

    function checkEts(headers) { // TODO change to "checkAppendMode".
        return headers && headers.map(h => h.toLowerCase()).toString() == ETS_COLUMNS.toString();
    }

    function getParsableDate(date) {
        return date.replaceAll(".", "/").replaceAll("\\", "/");
    }

    function isDate(date) {
        const convertedDate = new Date(date);
        return (convertedDate !== "Invalid Date") && !isNaN(convertedDate);
    }

    function isValidSheetForInitialLoad(sheetName) {
        return isDate(getParsableDate(sheetName));
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
     * @param {Date} dateToPredict Day to predict.
     * @returns Array of predicted values in order of headers.
     */
    function predictDay(values, headers, dateToPredict) {
        const startTime = new Date();
        // Tokenize data.
        const tokenizer = new Tokenizer(values, headers);
        const historiesPerToken = tokenizer.getTokenHistories(); // Map{token: [[y, timestamp], ], }
        // Predict day by specified histories.
        const prediction = Predictor.predict(historiesPerToken, tokenizer, dateToPredict); // Map{token: y, }.
        console.log("predictToday: predicted " + prediction.size + " rows/tokens in "
                + humanDiffWithCurrentDate(startTime) + ".")
        // Convert prediction from Map{token: y, } format to Spreadsheet rows.
        const result = [];
        prediction.forEach((y, token) => result.push(tokenizer.expandTokenPrediction(token, y, dateToPredict)));
        return result;
    }

    function isRowNotEmpty(row) {
        return !!row && row.every(x => !!x);
    }

    function humanDiffWithCurrentDate(startTime) {
        return Math.round(new Date() - startTime) + " ms";
    }
}
