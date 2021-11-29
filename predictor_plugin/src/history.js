// Handles history. Saves in separate sheet, extracts data to predict.
const History =  new function() {
    this.SHEET_NAME = 'PredictorHistory'
    this.DATE_COL = 'date'
    this.DEFAULT_COLUMNS = ["token", "y", "date"]

    /**
     * Saves current sheet into history.
     * @param {Date} date Date to save current history on. 
     */
    this.saveHistory = function(date) {
        let dateToSet = !date ? new Date(new Date().toDateString()) : date;
        let currentSheet  = SpreadsheetApp.getActiveSheet();
        let numRows = currentSheet.getDataRange().getNumRows();
        let numColumns = currentSheet.getDataRange().getNumColumns();
        const values = getSheetValues(currentSheet, 1, numRows, numColumns);
        values.forEach(row => row.push(dateToSet))

        const historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.SHEET_NAME);
        historySheet.getRange(historySheet.getLastRow() + 1, 1, values.length, values[0].length).setValues(values);
    }

    /**
     * Sends history to ML engine and adds result to current sheet.
     */
    this.sendHistoryAndGetPredicted = function() {
        let [data, headers] = getHistory(); // Headers required to put prediction columns in right order.
        let prediciton = mockedResponseFromMLService(data, headers);
        let currentSheet = SpreadsheetApp.getActiveSheet();
        let values = [];
        const isEts = headers.map(h => h.toLowerCase()).toString() == ETS_COLUMNS.toString();
        if (isEts) {
            values.push(["", "", ""])
        } else {
            currentSheet.clear();
        }
        values = values + prediciton;
        currentSheet.appendRow(values);
    }

    this.fillHistory = function() {
        let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.SHEET_NAME);
        if (historySheet == null || historySheet == undefined) {
            let allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
            let nameToIgnore = SpreadsheetApp.getActiveSheet().getName();
            let filteredSheets = allSheets.filter(sheet => isValidSheetForInitialLoad(sheet.getName(), nameToIgnore));
            let newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
            newSheet.setName(History.SHEET_NAME);
    
            if (filteredSheets.length > 0) {
    
                let initialNumColumns = filteredSheets[0].getDataRange().getNumColumns();
                let headers = getHeaders(getSheetValues(filteredSheets[0], 1, 1, initialNumColumns))
                        .filter(header => header != this.DATE_COL);
                headers.push(this.DATE_COL);
                newSheet.appendRow(headers);
                filteredSheets.forEach(sheet => {
                    let date = getParsableDate(sheet.getName());
                    let numRows = sheet.getDataRange().getNumRows();
                    let numColumns = sheet.getDataRange().getNumColumns();
                    let values = getSheetValues(sheet, 1, numRows, numColumns);
    
                    if (isHeadersRowProvided(values)) {
                        values.shift();
                    }
    
                    values.forEach(value => {
                        value.push(date);
                        newSheet.appendRow(value);
                    })
                });
            }
        }
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

    function isHeadersRowProvided(values) {
        for (let x of values[0]) {
            if (!isNaN(x)) {
                return false;
            }
        }
        return true;
    }

    function getHeaders(values) {
        if (!values) {
            return History.DEFAULT_COLUMNS;
        }
        for (let x of values[0]) {
            if (!isNaN(x)) {
                return History.DEFAULT_COLUMNS;
            }
        }
        return values[0];
    }

    function mapPredictMap(data, headers) {
        const startTime = new Date();
        let keys = Object.keys(data[0]); // They are the same in all rows.
        data = data.map(row => {
            let result = new Map();
            for (const key of keys) {
                result.set(key, row[key]);
            }
            return result
        });
        let tokenizer = new Tokenizer(data, headers);
        let historiesPerToken = tokenizer.getTokenHistories(Period.WEEKLY)
        console.log(historiesPerToken)
        let prediction = Predict.predict(historiesPerToken, tokenizer, new Date())
        console.log("Prediction: in " + Math.round(new Date() - startTime) + " ms got " + result)
        let result = [];
        prediction.forEach(row => {
            for (let key of headers) {
                if (isEts) {
                    values.push(row.get(key));
                } else if (key != this.DATE_COL && row.has(key)) {
                    values.push(row.get(key));
                }
            }
        });
        return result;
    }

    function getHistory() {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(History.SHEET_NAME);
        let numRows = sheet.getDataRange().getNumRows();
        let numColumns = sheet.getDataRange().getNumColumns();
        console.log("getHistory: numRows=" + numRows + ", numColumns=" + numColumns)
        let historyDtosForMl = [];
    
        let values = getSheetValues(sheet, 1, numRows, numColumns);
        let headers = getHeaders(values);
        historyDtosForMl = historyDtosForMl.concat(getMlDtos(values, headers));
        return [historyDtosForMl, headers]
    }

    function isRowEmpty(row) {
        return !!row && row.every(x => !!x);
    }

    function getSheetValues(sheet, colStart, numRows, colEnd) {
        return sheet.getRange(1, colStart, numRows, colEnd).getValues().filter(item => isRowEmpty(item));
    }
    
    function getPairColumnsValuesWithOffset(sheet, colIndex, numRows, colOffset, rowOffset) {
        return sheet.getRange(rowOffset, colIndex, numRows, colOffset).getValues().filter(item => isRowEmpty(item));
    }
}
