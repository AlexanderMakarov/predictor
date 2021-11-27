function isValidSheetForInitialLoad(sheetName, nameToIgnore) {
    return sheetName != nameToIgnore && isDate(getParsableDate(sheetName));
}

function isDate(date) {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

function getParsableDate(date) {
    return date.replaceAll(".", "/").replaceAll("\\", "/");
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

function getHeaders(values) {
    const DEFAULT_COLUMNS = ["token", "y", "date"]
    if (values == null || values == undefined || values.length == 0) {
        return DEFAULT_COLUMNS;
    }
    Logger.log(values[0])
    isNumberExist = false;
    for (let x of values[0]) {
        if (!isNaN(x)) {
            return DEFAULT_COLUMNS;
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
