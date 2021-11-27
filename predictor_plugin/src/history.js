// Handles history. Saves in separate sheet, extracts data to predict.
const History =  new function() {
    this.sheetName = 'PredictorHistory'
    this.dateCol = 'date'

    this.saveHistory = function(date) {
        let dateToSave = null;
        if (date == null || date == undefined) {
            dateToSave = new Date(new Date().toDateString());
        } else {
            dateToSave = date;
        }
        let currentSheet  = SpreadsheetApp.getActiveSheet();
        let numRows = currentSheet.getDataRange().getNumRows();
        let numColumns = currentSheet.getDataRange().getNumColumns();
        values = getPairColumnsValues(currentSheet, 1, numRows, numColumns);

        let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.sheetName);
        values.forEach(value => {
            value.push(dateToSave);
            historySheet.appendRow(value);
        });
    }

    this.sendHistoryAndGetPredicted = function() {
        let [data, headers] = getHistory(); // Headers required to put prediction columns in right order.
        let response = mockedResponseFromMLService(data, headers);
        let currentSheet = SpreadsheetApp.getActiveSheet();
        currentSheet.clear();
        response.forEach(row => {
            let values = [];
            for (let key of headers) {
                if (key != this.dateCol && row.has(key)) {
                    values.push(row.get(key));
                }
            }
            currentSheet.appendRow(values);
        });
    }

    this.fillHistory = function() {
        let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.sheetName);
        if (historySheet == null || historySheet == undefined) {
            let allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
            let nameToIgnore = SpreadsheetApp.getActiveSheet().getName();
            let filteredSheets = allSheets.filter(sheet => isValidSheetForInitialLoad(sheet.getName(), nameToIgnore));
            let newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
            newSheet.setName(History.sheetName);
    
            if (filteredSheets.length > 0) {
    
                let initialNumColumns = filteredSheets[0].getDataRange().getNumColumns();
                let headers = getHeaders(getPairColumnsValues(filteredSheets[0], 1, 1, initialNumColumns))
                        .filter(header => header != this.dateCol);
                headers.push(this.dateCol);
                newSheet.appendRow(headers);
                filteredSheets.forEach(sheet => {
                    let date = getParsableDate(sheet.getName());
                    let numRows = sheet.getDataRange().getNumRows();
                    let numColumns = sheet.getDataRange().getNumColumns();
                    let values = getPairColumnsValues(sheet, 1, numRows, numColumns);
    
                    if (isHeadersExists(values)) {
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

    function mockedResponseFromMLService(data, headers) {
        const startTime = new Date();
        let tokenizer = new Tokenizer(new Map(Object.entries(data)), headers);
        let historiesPerToken = tokenizer.getTokenHistories(Period.MONTHLY)
        console.log(historiesPerToken)
        let result = Predict.predict(historiesPerToken, tokenizer, new Date())
        console.log("Prediction: in " + Math.round(new Date() - startTime) + " ms got " + result)
        return result;
    }

    function getHistory() {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(this.sheetName);
        let numRows = sheet.getDataRange().getNumRows();
        let numColumns = sheet.getDataRange().getNumColumns();
        Logger.log("numRows=" + numRows + ", numColumns=" + numColumns)
        let historyDtosForMl = [];
    
        let values = getPairColumnsValues(sheet, 1, numRows, numColumns);
        let headers = getHeaders(values);
        historyDtosForMl = historyDtosForMl.concat(getMlDtos(values, headers));
        Logger.log(getPairColumnsValues(sheet, 1, numRows, numColumns));
        Logger.log(historyDtosForMl);
        return [historyDtosForMl, headers]
    }
}
