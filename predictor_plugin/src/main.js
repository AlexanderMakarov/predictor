// Entry point which makes user flow.

function onOpen(e) {
  History.initialize();
  addMenu();
}

function addMenu() {
  SpreadsheetApp.getUi()
      .createMenu('Predictor')
      .addItem("Predict Today", "History.predictAndUpdateCurrentSheet")
      .addSeparator()
      .addItem("Save history as Today", "History.saveHistory")
      .addItem('Save history for Date...', 'showDialog')
      .addToUi();
}

function showDialog() {
  var html = HtmlService.createHtmlOutputFromFile('static/dateDialog')
      .setWidth(500)
      .setHeight(400);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Please provide date to save content at');
}

function saveHistory(date) {
  History.saveHistory(date);
}

function testPrediction() {
  History.predictAndUpdateCurrentSheet();
}