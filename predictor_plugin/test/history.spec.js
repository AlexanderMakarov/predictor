const History = require('../src/history').History;
const tokenizer = require('../src/tokenizer');
const helpers = require('../src/helpers');
const mock = require('./spreadsheet-mocks');

global.checkEts = tokenizer.checkEts;
global.findSpecificColumn = tokenizer.findSpecificColumn;
global.DATE_WORDS = tokenizer.DATE_WORDS;
global.pairsArrayToString = helpers.pairsArrayToString;

const rangeEmpty = {
    'getNumColumns': () => 0,
    'getValues': jest.fn(() => []),
    'setValues': jest.fn(),
};
const rangeFoo1 = {
    'getNumColumns': () => 2,
    'getValues': jest.fn(() => [['foo', 1]]),
    'setValues': jest.fn(),
};
const rangeFoo1WithHeadersNoDate = {
    'getNumColumns': () => 2,
    'getValues': jest.fn(() => [['Item', 'Number'], ['foo', 1]]),
    'setValues': jest.fn(),
};
const rangeFoo1WithHeadersWithDate = {
    'getNumColumns': () => 3,
    'getValues': jest.fn(() => [['Item', 'Number', 'Date'], ['foo', 1, '2022-01-01']]),
    'setValues': jest.fn(),
};
const rangeHistoryHeaders = {
    'getNumColumns': () => History.DEFAULT_COLUMNS.length,
    'getValues': jest.fn(() => [History.DEFAULT_COLUMNS]),
    'setValues': jest.fn(),
};

describe('initialize', () => {
    test("empty ss", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeEmpty);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet);
        activeSpreadsheet.insertSheet = jest.fn(() => historySheet);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history sheet with default headers was created, tried to fill it up.
        assertActiveSsCreateHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).not.toHaveBeenCalled();
        expect(historySheet.appendRow).toHaveBeenCalledWith(History.DEFAULT_COLUMNS);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test("no history and headers in current sheet w/o date", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeEmpty);
        const activeSheet = mock.Sheet('Sheet 1', rangeFoo1WithHeadersNoDate);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet);
        activeSpreadsheet.insertSheet = jest.fn(() => historySheet);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history sheet with custom headers + "Date" was created.
        assertActiveSsCreateHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).not.toHaveBeenCalled();
        assertHaveBeenCalledOnceWith(historySheet.appendRow, ['Item', 'Number', History.DATE_COL]);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
        expect(rangeFoo1WithHeadersNoDate.setValues).not.toHaveBeenCalled();
    });
    test("no history and headers in current sheet w/ date", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeEmpty);
        const activeSheet = mock.Sheet('Sheet 1', rangeFoo1WithHeadersWithDate);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet);
        activeSpreadsheet.insertSheet = jest.fn(() => historySheet);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history sheet with custom headers + "Date" was created.
        assertActiveSsCreateHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).not.toHaveBeenCalled();
        assertHaveBeenCalledOnceWith(historySheet.appendRow, ['Item', 'Number', 'Date']);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
        expect(rangeFoo1WithHeadersNoDate.setValues).not.toHaveBeenCalled();
    });
    test("empty history exists", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeEmpty);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history sheet was filled.
        assertActiveSsInitializeForHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.appendRow).toHaveBeenCalledWith(History.DEFAULT_COLUMNS);
        expect(historySheet.clear).toHaveBeenCalledTimes(1);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test("history with only headers", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistoryHeaders);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that no actions performed.
        assertHaveBeenCalledOnceWith(activeSpreadsheet.getSheetByName, History.SHEET_NAME);
        expect(activeSpreadsheet.getSheets).not.toHaveBeenCalled();
        expect(activeSheet.getRange).not.toHaveBeenCalled();
        expect(historySheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.appendRow).not.toHaveBeenCalled();
        expect(historySheet.clear).not.toHaveBeenCalled();
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
        expect(rangeHistoryHeaders.setValues).not.toHaveBeenCalled();
    });
    test("history with data", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeFoo1WithHeadersWithDate);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that no actions performed.
        assertHaveBeenCalledOnceWith(activeSpreadsheet.getSheetByName, History.SHEET_NAME);
        expect(activeSpreadsheet.getSheets).not.toHaveBeenCalled();
        expect(activeSheet.getRange).not.toHaveBeenCalled();
        expect(historySheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.appendRow).not.toHaveBeenCalled();
        expect(historySheet.clear).not.toHaveBeenCalled();
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
        expect(rangeHistoryHeaders.setValues).not.toHaveBeenCalled();
    });
    test("history with wrong headers", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeFoo1);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history headers were recreated and all sheets scanned.
        assertActiveSsInitializeForHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.clear).toHaveBeenCalledTimes(1);
        assertHaveBeenCalledOnceWith(historySheet.appendRow, History.DEFAULT_COLUMNS);
        expect(rangeFoo1.setValues).not.toHaveBeenCalled();
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test("history with headers without date", () => {

        // Arrange.
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeFoo1WithHeadersNoDate);
        const activeSheet = mock.Sheet('Sheet 1', rangeFoo1WithHeadersNoDate);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        activeSpreadsheet.getSheets = jest.fn(() => [activeSheet, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history headers were recreated and all sheets scanned.
        assertHaveBeenCalledOnceWith(activeSpreadsheet.getSheetByName, History.SHEET_NAME);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.getRange).toHaveBeenCalledTimes(1);
        expect(historySheet.clear).toHaveBeenCalledTimes(1);
        assertHaveBeenCalledOnceWith(historySheet.appendRow, ['Item', 'Number', 'date']);
        expect(activeSpreadsheet.getSheets).toHaveBeenCalledTimes(1);
        expect(rangeFoo1WithHeadersNoDate.setValues).not.toHaveBeenCalled();
    });
    test("no history and extra data sheets", () => {

        // Arrange.
        rangeEmpty.getValues.mockReset();
        rangeFoo1.getValues.mockReset();
        const rangeOnlyHeaders = {
            'getValues': jest.fn(() => [['Product', 'Quantity']]),
            'getNumRows': jest.fn(() => 1),
            'getNumColumns': () => 2,
            'setValues': jest.fn(),
        };
        const rangeData1 = {
            'getValues': jest.fn(() => [['foo', 3], ['baz', 1]]),
            'getNumRows': jest.fn(() => 2),
            'getNumColumns': () => 2,
            'setValues': jest.fn(),
        };
        const rangeData2 = {
            'getValues': jest.fn(() => [[], ['foo', 2], [], ['bar', 2]]),
            'getNumRows': jest.fn(() => 4),
            'getNumColumns': () => 2,
            'setValues': jest.fn(),
        }
        const rangeData2FirstRow = {
            'getValues': jest.fn(() => [['foo', 2]]),
            'getNumRows': jest.fn(() => 1),
            'getNumColumns': () => 2,
            'setValues': jest.fn(),
        };
        const rangeHistory = {
            'getNumColumns': () => 0,
            'getValues': jest.fn(() => []),
            'setValues': jest.fn(),
        };
        const sheetCustom = mock.Sheet('Custom sheet', rangeEmpty);
        const sheet2021 = mock.Sheet('Products 2021', rangeFoo1);
        const sheet2021Jun = mock.Sheet('Products 2021-06', rangeEmpty);
        // Jul 1 sheet has custom headers and 2 rows of data.
        const sheet2021Jul1 = mock.Sheet('Products 2021-07-01', rangeData1);
        sheet2021Jul1.getRange = jest.fn((rowStart, colStart, rows, cols) => {
            if (rowStart == 1 && rows == 1) return rangeOnlyHeaders;
            else if (rowStart == 2, rows == 2) return rangeData1;
            else return null;
        })
        // Jul 7 sheet has 2 rows of data.
        const sheet2021Jul7 = mock.Sheet('Products 2021-07-07', rangeData2);
        sheet2021Jul7.getRange = jest.fn((rowStart, colStart, rows, cols) => {
            if (rowStart == 1 && rows == 1) return rangeData2FirstRow;
            else if (rowStart == 2, rows == 4) return rangeData2;
            else return null;
        })
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistory);
        historySheet.getLastRow = jest.fn()
                .mockImplementationOnce(() => 1)
                .mockImplementationOnce(() => 3);
        const activeSheet = mock.Sheet('Products', rangeFoo1WithHeadersNoDate);
        const activeSpreadsheet = mock.Spreadsheet(activeSheet);
        activeSpreadsheet.insertSheet = jest.fn(() => historySheet);
        activeSpreadsheet.getSheets = jest.fn(() => 
                [activeSheet, sheet2021, sheet2021Jun, sheet2021Jul1, sheet2021Jul7, sheetCustom, historySheet])
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.initialize();

        // Assert that history sheet with custom headers + "Date" was created...
        assertActiveSsCreateHistory(activeSpreadsheet);
        expect(activeSheet.getRange).toHaveBeenCalledTimes(1);
        assertHaveBeenCalledOnceWith(historySheet.appendRow, ['Item', 'Number', History.DATE_COL]);
        // and data from supported "dated" sheet is saved in history.
        expect(rangeEmpty.getValues).not.toHaveBeenCalled(); // Sheet names are not supported.
        expect(rangeFoo1.getValues).not.toHaveBeenCalled(); // Sheet name is not supported.
        expect(rangeData1.getValues).toHaveBeenCalledTimes(4); // 2 times from mock, 1 for header, 1 for data.
        expect(rangeData2FirstRow.getValues).toHaveBeenCalledTimes(1);
        expect(rangeData2.getValues).toHaveBeenCalledTimes(4); // 2 times from mock, 1 for header, 1 for data.
        expect(historySheet.getRange).toHaveBeenNthCalledWith(1, 2, 1, 2, 3); // To add data from sheet2021Jul1.
        expect(historySheet.getRange).toHaveBeenNthCalledWith(2, 4, 1, 2, 3); // To add data from sheet2021Jul7.
        expect(historySheet.getRange).toHaveBeenCalledTimes(2);
        expect(rangeHistory.setValues).toHaveBeenNthCalledWith(1, [
            ['foo', 3, new Date('2021-07-01')],
            ['baz', 1, new Date('2021-07-01')],
        ]);
        expect(rangeHistory.setValues).toHaveBeenNthCalledWith(2, [
            ['foo', 2, new Date('2021-07-07')],
            ['bar', 2, new Date('2021-07-07')],
        ]);
        expect(rangeHistory.setValues).toHaveBeenCalledTimes(2);
        expect(rangeData1.setValues).not.toHaveBeenCalled();
        expect(rangeData2FirstRow.setValues).not.toHaveBeenCalled();
        expect(rangeData2.setValues).not.toHaveBeenCalled();
    });
});

describe('saveHistory', () => {
    test('empty sheet', () => {

        // Arrange.
        rangeEmpty.getValues = jest.fn(() => []); // TODO why it doesn't work from definition?
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistoryHeaders);
        const activeSheet = mock.Sheet('Sheet 1', rangeEmpty);
        activeSheet.getRange = jest.fn((rowStart, colStart, rows, cols) => rangeEmpty)
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.saveHistory();

        // Assert that nothing happened with history or active sheet.
        assertHaveBeenCalledOnceWith(activeSheet.getRange, 1, 1, 0, 0)
        expect(historySheet.getRange).not.toHaveBeenCalled();
        expect(historySheet.appendRow).not.toHaveBeenCalled();
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test('only headers', () => {

        // Arrange.
        const rangeActive = {
            'getNumColumns': () => 2,
            'getValues': jest.fn(() => [['Name', 'Count']]),
            'setValues': jest.fn(),
        };
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistoryHeaders);
        const activeSheet = mock.Sheet('Sheet 1', rangeActive);
        activeSheet.getRange = jest.fn((rowStart, colStart, rows, cols) => rangeActive)
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        mock.SpreadsheetApp(activeSpreadsheet);

        // Act
        History.saveHistory();

        // Assert that nothing happened with history or active sheet.
        assertHaveBeenCalledOnceWith(activeSheet.getRange, 1, 1, 1, 2)
        expect(historySheet.getRange).not.toHaveBeenCalled();
        expect(historySheet.appendRow).not.toHaveBeenCalled();
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test('dense data, no date', () => {

        // Arrange.
        const rangeActive = {
            'getNumColumns': () => 2,
            'getValues': jest.fn(() => [['foo', 1], ['bar', 3]]),
            'setValues': jest.fn(),
        };
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistoryHeaders);
        const activeSheet = mock.Sheet('Sheet 1', rangeActive);
        activeSheet.getRange = jest.fn((rowStart, colStart, rows, cols) => rangeActive)
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        mock.SpreadsheetApp(activeSpreadsheet);
        const todayDate = History.getTodayDate(); // If test start right before new day start it may fail.

        // Act
        History.saveHistory();

        // Assert that nothing happened with history or active sheet.
        assertHaveBeenCalledOnceWith(activeSheet.getRange, 1, 1, 2, 2);
        assertHaveBeenCalledOnceWith(historySheet.getRange, 2, 1, 2, 3);
        assertHaveBeenCalledOnceWith(rangeHistoryHeaders.setValues, [['foo', 1, todayDate], ['bar', 3, todayDate]]);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
    test('sparse data, headers, specific date', () => {

        // Arrange.
        const rangeActive = {
            'getNumColumns': () => 2,
            'getValues': jest.fn(() => [['Имя', 'Количество'], ['стол', 2], [], ['стул', 3]]),
            'setValues': jest.fn(),
        };
        rangeHistoryHeaders.setValues = jest.fn();
        const historySheet = mock.Sheet(History.SHEET_NAME, rangeHistoryHeaders);
        const activeSheet = mock.Sheet('Sheet 1', rangeActive);
        activeSheet.getRange = jest.fn((rowStart, colStart, rows, cols) => rangeActive)
        const activeSpreadsheet = mock.Spreadsheet(activeSheet,
                (name) => name == History.SHEET_NAME ? historySheet : null);
        mock.SpreadsheetApp(activeSpreadsheet);
        const date = new Date('2022-01-22');

        // Act
        History.saveHistory(date);

        // Assert that nothing happened with history or active sheet.
        assertHaveBeenCalledOnceWith(activeSheet.getRange, 1, 1, 4, 2);
        assertHaveBeenCalledOnceWith(historySheet.getRange, 2, 1, 2, 3);
        assertHaveBeenCalledOnceWith(rangeHistoryHeaders.setValues, [['стол', 2, date], ['стул', 3, date]]);
        expect(rangeEmpty.setValues).not.toHaveBeenCalled();
    });
});

function assertHaveBeenCalledOnceWith(mock, ...args) {
    expect(mock).toHaveBeenCalledWith(...args);
    expect(mock).toHaveBeenCalledTimes(1);
}

function assertActiveSsInitializeForHistory(activeSpreadsheet) {
    assertHaveBeenCalledOnceWith(activeSpreadsheet.getSheetByName, History.SHEET_NAME);
    expect(activeSpreadsheet.getSheets).toHaveBeenCalledTimes(1);
}

function assertActiveSsCreateHistory(activeSpreadsheet) {
    assertActiveSsInitializeForHistory(activeSpreadsheet);
    assertHaveBeenCalledOnceWith(activeSpreadsheet.insertSheet, History.SHEET_NAME);
    assertHaveBeenCalledOnceWith(activeSpreadsheet.setActiveSheet, activeSpreadsheet.getActiveSheet());
}

