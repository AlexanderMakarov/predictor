const History = require('../src/history').History;
const tokenizer = require('../src/tokenizer');
const SpreadsheetApp = require('gasmask').SpreadsheetApp;

global.SpreadsheetApp = SpreadsheetApp;
global.checkEts = tokenizer.checkEts;

test("initialize empty ss", () => {

    // Arrange.
    const emptyRange = {
        'getNumColumns': () => 0,
        'getValues': () => [['foo', 1]],
    };
    const historySheet = {
        'getDataRange': () => emptyRange,
        'getRange': jest.fn((rowStart, colStart, rowEnd, colEnd) => emptyRange),
        'appendRow': jest.fn(),
        'getName': jest.fn(() => History.SHEET_NAME),
    };
    const activeSheet = {
        'getName': jest.fn(() => 'Sheet 1'),
        'getDataRange': () => emptyRange,
        'getRange': (rowStart, colStart, rowEnd, colEnd) => emptyRange,
    };
    const activeSs = {
        'getActiveSheet': jest.fn(() => activeSheet),
        'getSheetByName': jest.fn((name) => null),
        'insertSheet': jest.fn(() => historySheet),
        'setActiveSheet': jest.fn(),
        'getSheets': jest.fn(() => []),
    };
    SpreadsheetApp.getSheetByName = jest.fn((name) => name == History.SHEET_NAME ? historySheet : null);
    SpreadsheetApp.getActiveSpreadsheet = jest.fn(() => activeSs);

    // Act
    History.initialize();

    // Assert spreadsheet was observed and new history spreadsheet created with default columns.
    expect(activeSs.getSheetByName).toHaveBeenCalledWith(History.SHEET_NAME);
    expect(activeSs.getSheetByName).toHaveBeenCalledTimes(1);
    expect(activeSs.insertSheet).toHaveBeenCalledWith(History.SHEET_NAME);
    expect(activeSs.insertSheet).toHaveBeenCalledTimes(1);
    expect(activeSs.getSheets).toHaveBeenCalledTimes(1);
    expect(historySheet.appendRow).toHaveBeenCalledWith(History.DEFAULT_COLUMNS);
    expect(historySheet.getRange).not.toHaveBeenCalled();
});