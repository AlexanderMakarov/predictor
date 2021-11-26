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
      .addItem("Predict Today", "function2")
      .addToUi();
}
  
function myFunction() {
  Logger.log(SpreadsheetApp.getActiveSpreadsheet().getSheets().map(sheet => sheet.getName()))
  // SpreadsheetApp.getActiveSheet()
}
  