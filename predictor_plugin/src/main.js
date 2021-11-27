// Global namespace which makes user flow.

function onOpen(e) {
  History.fillHistory();
  addMenu();
}

function addMenu() {
  SpreadsheetApp.getUi()
      .createMenu('Predictor')
      .addSeparator()
      .addItem("Predict Today", "History.sendHistoryAndGetPredicted")
      .addSeparator()
      .addItem("Save history as Today", "History.saveHistory")
      .addItem('Save history for Date...', 'showDialog')
      .addToUi();
}

function showDialog() {
  var html = HtmlService.createHtmlOutputFromFile('static/dateDialog')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Please provide a new Date');
}