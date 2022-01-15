// Basic mocks for GAS SpreadsheetApp and below.

/**
 * Basic `Sheet` constructor with few default methods wrapped into Jest mocks.
 * 
 * @param {String} name Name of sheet.
 * @param {Range} range Range to return from all getters.
 * @returns Custom object with mocked 'getName', 'getDataRange', 'getRange', 'appendRow', 'clear', 'getLastRow',
 *      'getLastColumn' methods.
 */
function Sheet(name, range) {
    return {
        'getName': jest.fn(() => name),
        'getDataRange': jest.fn((...args) => range),
        'getRange': jest.fn((...args) => range),
        'appendRow': jest.fn(),
        'getLastRow': jest.fn(() => range ? range.getValues().length : 0),
        'getLastColumn': jest.fn(() => {
            if (!range) return 0;
            const values = range.getValues();
            return (values && values.length > 0) ? values[0].length : 0;
        }),
        'clear': jest.fn(),
    }
} 

/**
 * Basic `Spreadsheet` constructor with few default methods wrapped into Jest mocks.
 * 
 * @param {Sheet} activeSheet Active sheet.
 * @param {Function} getSheetByName Function for `getSheetByName` implementation. By-default return `null`.
 * @returns Custom object with mocked 'getActiveSheet', 'getSheetByName', 'setActiveSheet' methods.
 */
function Spreadsheet(activeSheet, getSheetByName=null) {
    return {
        'getActiveSheet': jest.fn(() => activeSheet),
        'getSheetByName': jest.fn(getSheetByName ? getSheetByName : (_name) => null),
        'setActiveSheet': jest.fn(),
    }
};

/**
 * Creates `SpreadsheetApp` object and mocks it in `global` variable.
 * 
 * @param {Spreadsheet} activeSpreadsheet 
 */
function SpreadsheetApp(activeSpreadsheet, ui=null) {
    SpreadsheetApp.getActiveSpreadsheet = jest.fn(() => activeSpreadsheet);
    SpreadsheetApp.getUi = jest.fn(ui ? ui : () => null);
    global.SpreadsheetApp = SpreadsheetApp;
    return SpreadsheetApp;
}

module.exports = {
    'Sheet': Sheet,
    'Spreadsheet': Spreadsheet,
    'SpreadsheetApp': SpreadsheetApp,
}
