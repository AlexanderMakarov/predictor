// Set of general helpers.

/**
 * Groups list of `Map`-s by value in given key/column.
 * @param {Array} mapsArray List of `Map`-s/rows to reduce.
 * @param {String} key Key/column to reduce by distinct values in.
 * @returns Map where keys are distinct values of given column, values are rows with related cell value.
 */
function groupBy(mapsArray, key) { // https://stackoverflow.com/a/39886097/1535127 updated for Map
    let reducer = (grouped, item) => {
        let option = item[key];
        let arr = grouped.get(option);
        if (arr) {
            arr.push(item);
        } else {
            grouped.set(option, [item]);
        }
        return grouped;
    }
    return mapsArray.reduce(reducer, new Map());
}

// function groupBy(arr, key) {
//     const reducer = function(grouped, x) {
//         let option = x[key];
//         if (grouped[option]) {
//             grouped[option].push(x);
//         } else {
//             grouped[option] = [x];
//         }
//         return grouped;
//     }
//     return arr.reduce(reducer, [])
// }

function pairsArrayToString(pairsArray) {
    return '[' + pairsArray.map((key, value) => `m[${key}] = ${value}`).join(', ') + ']';
}

function shortenized(str, prefixLen, suffixLen) {
    if (str == null || str == NaN) {
        return "null"
    }
    if (str.length <= prefixLen + suffixLen + 3) {
        return str;
    }
    return str.slice(0, prefixLen) + '...' + str.slice(-suffixLen);
}

function substractDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}
