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
