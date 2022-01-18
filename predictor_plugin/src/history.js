// Handles history. Saves in separate sheet, extracts data to predict.
const History = new function() {
    this.SHEET_NAME = 'PredictorHistory'
    this.DATE_COL = 'date'
    this.DEFAULT_COLUMNS = ["token", "y", this.DATE_COL]
    this.EXTRACT_DATE_REGEX = new RegExp(".+?([0-9]{1,4}([\-/ \.])[0-9]{1,2}[\-/ \.][0-9]{1,4}).*");
    this.APPEND_MODE_PREDICTION_OFFSET_ROWS = 3;

    /**
     * Saves current sheet into history (existing).
     * @param {Date} date Date to save current history on. If not specified uses today.
     * @returns Number of saved rows.
     */
    this.saveHistory = function(date) {
        const startTime = new Date();
        const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const currentSheet = currentSpreadsheet.getActiveSheet();
        const headers = getHeaders(currentSheet);
        const historySheet = currentSpreadsheet.getSheetByName(History.SHEET_NAME);
        let values = getSheetAllValues(currentSheet, !!headers);
        if (!!values) {
            console.log("No data ('" + values + "') in current '" + currentSheet + "' sheet, doing nothing.");
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
        return numRows;
    }

    /**
     * Sends history to ML engine and updates current sheet with results.
     */
    this.predictAndUpdateCurrentSheet = function() {// TODO ask day to predict.
        const startTime = new Date();
        const dateToPredict = startTime;
        const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const historySheet = currentSpreadsheet.getSheetByName(History.SHEET_NAME);
        const headers = getHeaders(historySheet)
        const history = historySheet.getRange(2, 1, historySheet.getLastRow(), historySheet.getLastColumn()).getValues()
                .filter(item => isRowNotEmpty(item));
        const isAppend = checkEts(headers);
        const prediction = predictDay(history, headers, dateToPredict);

        // Update current sheet.
        const currentSheet = currentSpreadsheet.getActiveSheet();
        if (isAppend) {
            currentSheet.getRange(currentSheet.getLastRow() + History.APPEND_MODE_PREDICTION_OFFSET_ROWS, 1,
                    prediction.length, prediction[0].length).setValues(prediction);
        } else {
            if (getHeaders(currentSheet)) { // If current sheet has headers then keep them but from history.
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
     * @returns Error message about not satisfied condition or `null` if initialized successfully.
     */
    this.initialize = function() {
        const startTime = new Date();
        const currentSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let historySheet = currentSpreadsheet.getSheetByName(History.SHEET_NAME);
        let historyHeaders = getHeaders(historySheet);
        // Initialized == History.SHEET_NAME exists && contains headers with date.
        if (!historyHeaders || !findSpecificColumn(historyHeaders, DATE_WORDS, true)) {
            const currentSheet = currentSpreadsheet.getActiveSheet();
            const currentSheetName = currentSheet.getName();
            if (!historySheet) { // Create history sheet if need.
                historySheet = currentSpreadsheet.insertSheet(History.SHEET_NAME);
                currentSpreadsheet.setActiveSheet(currentSheet); // Don't lead user on 'history' sheet.
            } else {
                historySheet.clear(); // Clear all content if sheet exists but with wrong data.
            }
            const headersCurrentSheet = getHeaders(currentSheet);
            const isAppendMode = checkEts(headersCurrentSheet); // Check mode by current sheet only.
            // Set headers for 'history'. In 'append' mode use existing headers as is. 
            // Prefer existing headers but 'date' header is vital for 'history' and need to be added if doesn't exist.
            historyHeaders = headersCurrentSheet;
            if (!isAppendMode) {
                if (!headersCurrentSheet) {
                    // Add default headers if current sheet doesn't have them at all.
                    historyHeaders = History.DEFAULT_COLUMNS;
                } else if (!findSpecificColumn(headersCurrentSheet, DATE_WORDS, true)) {
                    // Add 'date' column if current sheet headers don't have such.
                    historyHeaders.push(History.DATE_COL);
                }
            }
            historySheet.appendRow(historyHeaders); // Append headers.
            // Fill history from other sheets. Sheet should containt date somewhere.
            currentSpreadsheet.getSheets().forEach(sheet => {
                let sheetName = sheet.getName();
                if (sheetName == currentSheetName || sheetName == History.SHEET_NAME) {
                    return; // TODO is it right for ETS? Skip history sheet and current sheet.
                }
                let date = parseDateFromText(sheetName);
                if (!isAppendMode && !date) {
                    console.log("initialize: skipping '" + sheet.getName() + "' sheet as not supported.");
                    return; // Skip sheets without date in name.
                }
                let headers = getHeaders(sheet);
                if (isAppendMode && !checkEts(headers)) {
                    console.log("initialize: skipping '" + sheet.getName()
                            + "' because doesn't have 'Append' mode headers");
                    return; // If 'append' mode skip sheets without 'append' mode headers.
                }
                let values = getSheetAllValues(sheet, !!headers);
                if (!values) {
                    console.log("initialize: skipping '" + sheet.getName() + "' sheet because it's empty.");
                    return; // Skip empty sheets.
                }
                if (!isAppendMode) { // TODO support custom 'date' column. If not 'append' mode then append date value.
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
        return null;
    }

    this.getTodayDate = function() {
        return new Date(new Date().toDateString());
    }

    function parseDateFromText(text) {
        const result = text.match(History.EXTRACT_DATE_REGEX);
        if (result) {
            return new Date(result[1]);
        }
    }

    /**
     * Tries to extract headers from provided sheet. Differs headers from regular row by `isNan` call on each cell.
     * @param {Sheet} sheet Sheet to search header in.
     * @returns Array of column names in order or `null` if header is not found.
     */
    function getHeaders(sheet) {
        if (sheet) {
            const firstRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
            if (firstRow && firstRow.every(x => isNaN(x))) {
                return firstRow;
            }
        }
        return null;
    }

    function getSheetAllValues(sheet, isSkipHeader) {
        const numRows = sheet.getLastRow();
        const numColumns = sheet.getLastColumn();
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

    function isRowNotEmpty(row) { // TODO support rows with empty cells (many columns case).
        return !!row && row.length > 0 && row.every(x => !!x);
    }

    function humanDiffWithCurrentDate(startTime) {
        return Math.round(new Date() - startTime) + " ms";
    }
}
