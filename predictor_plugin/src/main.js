// Global namespace which makes user flow.

function onOpen(e) {
  addMenu();
  addSiderBar();
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
      .addItem("Predict Today", "sendHistoryAndRedraw")
      .addToUi();
}
  
/*function myFunction() {
  Logger.log(SpreadsheetApp.getActiveSpreadsheet().getSheets().map(sheet => sheet.getName()))
  // SpreadsheetApp.getActiveSheet()
}*/


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

function getPairColumnsValuesRaw(sheet, columnIndex, numRows, columnOffset) {
  return sheet.getRange(1, columnIndex, numRows, columnOffset).getValues();
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

