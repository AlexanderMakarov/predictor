// Entry point which makes user flow.

function onOpen(e) {
  History.initialize();
  addMenu();
}

function onInstall(e) {
  // TODO Show Help page
}

function addMenu() {
  SpreadsheetApp.getUi()
      .createMenu('Predictor')
      .addItem("Predict Today", "predictToday")
      .addSeparator()
      .addItem("Save history as Today", "saveHistoryAsToday")
      .addItem('Save history for Date...', 'saveHistoryForDate')
      .addToUi();
}

function saveHistoryForDate() {
  var html = HtmlService.createHtmlOutputFromFile('static/dateDialog')
      .setWidth(500)
      .setHeight(400);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Please provide date to save content at');
}

function saveHistoryAsToday() {
  const date = History.getTodayDate();
  History.saveHistory(date);
  SpreadsheetApp.getUi().alert('Current sheet data is saved for ' + date + '.');
}

function predictToday() {
  History.predictAndUpdateCurrentSheet();
}