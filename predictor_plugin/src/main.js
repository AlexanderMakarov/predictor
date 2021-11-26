// Global namespace which makes user flow.

function onOpen(e) {
  fillHistory();
  addMenu();
  //addSiderBar();
}

function addSiderBar() {
  const htmlService = HtmlService.createTemplateFromFile("static/sidebar.html");
  const html = htmlService.evaluate().setTitle("Predictor");
  const ui = SpreadsheetApp.getUi();
  ui.showSidebar(html);
}
  
function addMenu() {
  SpreadsheetApp.getUi()
      .createMenu('Predictor')
      .addItem("Show Predictor UI", "addSiderBar")
      .addSeparator()
      .addItem("Predict Today", "sendHistoryAndGetPredicted")
      .addSeparator()
      .addItem("Save history as Today", "saveHistory")
      .addSeparator()
      .addItem('Save history for date...', 'showDialog')
      .addToUi();
}
  
function fillHistory() {
  let historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(History.sheetName);
  if (historySheet == null || historySheet == undefined) {
    let allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
    let nameToIgnore = SpreadsheetApp.getActiveSheet().getName();
    let filteredSheets = allSheets.filter(sheet => isValidSheetForInitialLoad(sheet.getName(), nameToIgnore));
    let newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
    newSheet.setName(History.sheetName);

    if (filteredSheets.length > 0) {

      let initialNumColumns = filteredSheets[0].getDataRange().getNumColumns();
      let headers = getHeaders(getPairColumnsValues(filteredSheets[0], 1, 1, initialNumColumns)).filter(header => header != "date");
      headers.push("date");
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

function isValidSheetForInitialLoad(sheetName, nameToIgnore) {
  return sheetName != nameToIgnore && isDate(getParsableDate(sheetName));
}

function isDate(date) {
  return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

function getParsableDate(date) {
  return date.replaceAll(".", "/").replaceAll("\\", "/");
}

function showDialog() {
  var html = HtmlService.createHtmlOutputFromFile('static/dateDialog')
      .setWidth(500)
      .setHeight(400);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Please provide a new Date');
}

function saveHistory(date) {
  //Browser.msgBox(date);
  let dateToSave = null;
  if (date == null || date == undefined) {
    dateToSave = new Date();
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

function sendHistoryAndGetPredicted() {
  let response = mockedResponseFromMLService(getHistory());
  let currentSheet  = SpreadsheetApp.getActiveSheet();
  currentSheet.clear();
  response.forEach(row => {
    let keys = Object.keys(row).filter(key => "date" != key);
    let values = [];
    keys.forEach(key => {
      values.push(row[key]);
    });
    currentSheet.appendRow(values);
  });
}

function getHistory() {
  let isEts = false;
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = isEts ? ss.getSheetByName("etsHistory") : ss.getSheetByName(History.sheetName);
  let numRows = sheet.getDataRange().getNumRows();
  let numColumns = sheet.getDataRange().getNumColumns();
  Logger.log("numRows: " + numRows)
  Logger.log("numColumns: " + numColumns)
  Logger.log("==========")
  let historyDtosForMl = [];

  values = getPairColumnsValues(sheet, 1, numRows, numColumns);
  historyDtosForMl = historyDtosForMl.concat(getMlDtos(values, getHeaders(values)));
  Logger.log(getPairColumnsValues(sheet, 1, numRows, numColumns));
  Logger.log(historyDtosForMl);
  Logger.log("==========")
}

function getPairColumnsValues(sheet, columnIndex, numRows, columnOffset) {
  return sheet.getRange(1, columnIndex, numRows, columnOffset).getValues().filter(item => isItemValid(item));
}

function getPairColumnsValuesWithOffset(sheet, columnIndex, numRows, columnOffset, rowOffset) {
  return sheet.getRange(rowOffset, columnIndex, numRows, columnOffset).getValues().filter(item => isItemValid(item));
}

function isItemValid(item) {
  if (item == null || item == undefined) {
    return false;
  }
  for (let i = 0; i < item.length; i++) {
     if (item[i] == null || item[i] == undefined || item[i].length == 0) {
       return false;
     }
  }
  return true;
}

function getMlDtos(values, headers) {
  let result = [];
  for (let i=1; i < values.length; i++) {
    result.push(getMlDto(values[i], headers))
  }
  return result;
}

function getMlDto(item, headers) {
  let result = {};
  for (let i = 0; i < headers.length; i++) {
    result[headers[i]] = item[i];
  }
  return result;
}

function mockedResponseFromMLService(data) {
  return JSON.parse("[{\"token\":\"бананы\",\"y\":2,\"date\":\"2021-10-30T21:00:00.000Z\"},{\"token\":\"Помидоры \",\"y\":6,\"date\":\"2021-10-30T21:00:00.000Z\"}]");
}

function getHeaders(values) {
  if (values == null || values == undefined || values.length == 0) {
    return ["token", "y", "date"];
  }
  Logger.log(values[0])
  isNumberExist = false;
  for (let i = 0; i < values[0].length; i++) {
      if (!isNaN(values[0][i])) {
        return ["token", "y", "date"]
      }
  }
  return values[0];
}

function isHeadersExists(values) {
  for (let i = 0; i < values[0].length; i++) {
    if (!isNaN(values[0][i])) {
      return false;
    }
  }
  return true;
}

