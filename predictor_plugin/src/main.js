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

  return historyDtosForMl;
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
  // let data = [{"token":"бананы","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Рис, пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Каша для взрослых, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курага, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Чернослив, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Яйцо куриное, десяток","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творожки Даниссимо(2 одного вкуса, 2 другого  вкуса) ","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Йогурты для Саши в село","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог детский ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сгущёнка в село","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Свинина не жирная","y":0.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Колбаса, небольшая","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сушки челночёк, средние, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"освежитель воздуха, морской(на квартиру)","y":"2 шт","date":"2021-10-30T21:00:00.000Z"},{"token":"какао(в село и в город)","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-06T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"дыня? ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"огурцы","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"гречка, упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог детский ","y":5,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Свинина не жирная","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб белый(булочки)","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб чёрный, 0,5 буханки чёрного хлеба","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"чай чёрный для города , листовой","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"маленькие батончики шоколадные(для дней рождений)","y":3,"date":"2021-11-06T21:00:00.000Z"},{"token":"кофе молотый для Лёши на ДР","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"детские комбинезоны нательные(хлопковые) с закрытыми пятками и длинными рукавами, на клёпках. Если будут размера 92(не меньше) по цене не дороже 200(250) руб.за штуку","y":2,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"Помидоры ","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"огурцы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"лук репчатый, большие луковицы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":2,"date":"2021-11-10T21:00:00.000Z"},{"token":"молоко детское","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"творог детский","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"говядина","y":0.5,"date":"2021-11-10T21:00:00.000Z"},{"token":"брокколи замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"цветная капуста замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"любой вид","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-13T21:00:00.000Z"},{"token":"груши","y":5,"date":"2021-11-13T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Помидоры ","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"огурцы ","y":2,"date":"2021-11-13T21:00:00.000Z"},{"token":"булгур, пачка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-13T21:00:00.000Z"},{"token":"Творог Можайский, пачка 200г","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"молоко для взрослых, пачек","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"курица","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"фарш домашний, кг","y":0.6,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб чёрный, маленький ","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"туалетная бумага","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Саше","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Оле","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"трусики для Виктории 4 размер большая упаковка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"бананы","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-18T21:00:00.000Z"},{"token":"груши","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"хурма","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"огурцы","y":2,"date":"2021-11-18T21:00:00.000Z"},{"token":"изюм, небольшой пакет","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-18T21:00:00.000Z"},{"token":"Творог Можайский","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"яйцо, десяток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"говядина, лоток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб тостовый?","y":0.5,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб чёрный","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-18T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"крем детский, тюбик(можно купить в воскресенье)","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"бананы","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"виноград","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"груши","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"огурцы","y":5,"date":"2021-11-20T21:00:00.000Z"},{"token":"помидоры","y":8,"date":"2021-11-20T21:00:00.000Z"},{"token":"каши для взрослых, можно просто крупу овсяную и др.","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"курага","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"чернослив","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"сыр мягкий","y":1,"date":"2021-11-20T21:00:00.000Z"}]
  data = data.map(x => new Map([['token', x['token']], ['y', x['y']], ['date', new Date(x['date'])]]))

  let tokenizer = new Tokenizer(data);
  let historiesPerToken = tokenizer.getTokenHistories(Period.MONTHLY)
  console.log(historiesPerToken)
  let result = Predict.predict(historiesPerToken, tokenizer, new Date())
  console.log(result)
  return result;
  //return JSON.parse("[{\"token\":\"бананы\",\"y\":2,\"date\":\"2021-10-30T21:00:00.000Z\"},{\"token\":\"Помидоры \",\"y\":6,\"date\":\"2021-10-30T21:00:00.000Z\"}]");
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

