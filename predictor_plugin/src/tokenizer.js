// Converts spreadsheet data into tables which may be predicted. Works with History and CurrentSheet.

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

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DATE_WORDS = ['date', 'дата', 'time', 'день', 'когда']
const Y_WORDS = ['quantity', 'количество', 'кол-во', 'effort', 'сколько', 'number', 'qnty', 'count', 'y']
const ETS_COLUMNS = ['project-task', 'effort', 'description', 'date']
const SEPARATOR = "###"

class Tokenizer {
    // Same name strategy.

    /**
     * Concstructor.
     * @param {Array} data 2D array of history values.
     * @param {Array} headers Array of headers in order of values provided.
     */
    constructor(data, headers) {
        this.data = data;
        this.headers = headers;
        this.isEts = headers.map(h => h.toLowerCase()).toString() == ETS_COLUMNS.toString()
    }

    /**
     * Tokenizes data with "same token" strategy. Produces token = value from 'token' column.
     * @returns Map{'token': [[number, timestamp], ], } for prediction call.
     */
    getTokenHistories() {
        if (!this.data) {
            return null;
        }
        console.log('getTokenHistories: got ' + this.data.length + ' rows of '
                + (this.isEts ? 'ETS' : 'token-column') + ' data')
        // 1) Find data characteristics like specific column indexes.
        // TODO keep only indexes.
        this.dateCol = this.findSpecificColumn(DATE_WORDS, true);
        this.dateColIndex = this.headers.findIndex(x => x == this.dateCol);
        this.yCol = this.findSpecificColumn(Y_WORDS, false);
        this.yColIndex = this.headers.findIndex(x => x == this.yCol);
        let lastTimestampInData = new Date(this.data[this.data.length - 1][this.dateColIndex]);
        // 2) Tokenize data.
        // TODO separate infinetily. For now only "token-column" and "ETS" cases.
        let groupedData = null // {token: [Map{...}]}
        if (this.isEts) {
            groupedData = new Map()
            const groupedByTask = groupBy(this.data, 0); // {'task1': [['task1', '', '', ''], ...]}
            groupedByTask.forEach((taskHistory, task) => {
                if (taskHistory && taskHistory.length > 0) {
                    const groupedByDesc = groupBy(taskHistory, 2) // {'desc1': [['', '', 'desc1', ''], ...]}
                    groupedByDesc.forEach((descHistory, desc) => { // Save under composite key.
                        groupedData.set(task + SEPARATOR + desc, descHistory)
                    })
                }
            })
        } else {
            // TODO expand to any number of 'token' columns. Now only first 'not date' and 'not y'.
            const tokenColIndex = this.headers.findIndex(h => 
                    h.toLowerCase() != this.dateCol && h.toLowerCase() != this.yCol);
            groupedData = groupBy(this.data, tokenColIndex)
        }
        console.log("getTokenHistories: found " + groupedData.size + " unique tokens, limiting them...")
        // 3) Limit history and convert rows to '[number, timestamp]' format (i.e. ['y', 'date']).
        let result = new Map()
        groupedData.forEach((history, token) => {
            history = this.limitHistory(history, lastTimestampInData)
            if (history && history.length > 0) {
                result.set(token, history.map(x => [Number.parseFloat(x[this.yColIndex]), new Date(x[this.dateColIndex]).getTime()]))
            }
        })
        console.log('getTokenHistories: ending up with ' + result.size + ' tokens='
                + Array.from(result.keys()).map(x => shortenized(x, 15, 10)))
        return result
    }

    /**
     * Finds not empty history days.
     * @returns Set of days in history having values in "starting from oldest" order.
     */
    getNotEmptyHistoryDays() {
        return Array.from(this.data.reduce(
                (grouped, x) => grouped.add(new Date(x[this.dateColIndex]).getTime()), new Set())
            ).sort()
    }

    /**
     * Finds max 'y' value in history.
     * @returns Max 'y' value.
     */
    getMaxY() {
        return Math.max.apply(Math, this.data.map(row => row[this.dateColIndex]));
    }

    limitHistory(data, lastTimestampInData) {
        // 1. (checked few times) If only one row it should be in the last day.
        // - 2. Last occurence shouldn't be older than 30 periods.
        // - 3. Max history is 60 periods.
        // 4. At least one row in result.
        if (!data || data.length < 1) {
            return null;
        }
        if (this.checkNotOneRowOnDifferentDay(data, lastTimestampInData)) { // 1
            return null;
        }
        // let lastDay = data[data.length - 1][this.dateColIndex]
        // if (Math.ceil(lastTimestampInData - lastDay) / MS_PER_DAY > 30 * period) { // 2
        //     return null;
        // }
        // let dayNotOlderThan = substractDays(lastTimestampInData, 60 * period) // 3
        // data = data.filter(x => x[this.dateColIndex] >= dayNotOlderThan)
        // if (data.length < 1) { // 4
        //     return null;
        // }
        // if (this.checkNotOneRowOnDifferentDay(data, lastTimestampInData)) { // 1
        //     return null;
        // }
        return data;
    }

    expandTokenPrediction(token, y, dateToPredict) {
        if (this.isEts) {
            const parts = token.split(SEPARATOR);
            return [parts[0], y, parts[1], dateToPredict]
        }
        return [token, y];
    }

    checkNotOneRowOnDifferentDay(data, day) {
        const tmp = data[0][this.dateColIndex] // TODO remove
        return (data.length == 1 && new Date(data[0][this.dateColIndex]).getTime() != day.getTime())
    }

    findSpecificColumn(words, isSearchShortest) {
        // 1 step - find all columns possible.
        const columnsWithWord = {}
        this.headers.map((column, index) => {
            let c = column.toLowerCase();
            words.forEach((word) => { // Save all possible columns.
                if (c == word) {
                    columnsWithWord[column] = index;
                }
            })
        })
        console.log("findSpecificColumn: '" + words + "' column in '" + this.headers + "' - got "
                + pairsArrayToString(Object.entries(columnsWithWord)) + ".")
        if (columnsWithWord.length == 1) {
            return columnsWithWord.keys()[0];
        } else if (columnsWithWord.length == 0) {
            return null;
        }
        // 2 step - set weight by index and number of characters.
        // 3 step - sort by weight and take first.
        let column = null
        let curWeight = 0
        Object.entries(columnsWithWord).forEach(([c, index]) => {
            let weight = isSearchShortest
                    ? (words.length - index) * 1000 + (999 - c.length)
                    : index // The more right the more chance that it is required column.
            console.log("findSpecificColumn: set " + weight + " weight for '" + c + "'.")
            if (weight > curWeight) {
                column = c
                curWeight = weight
            }
        })
        return column;
    }
}

// let data = [{"token":"бананы","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Рис, пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Каша для взрослых, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курага, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Чернослив, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Яйцо куриное, десяток","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творожки Даниссимо(2 одного вкуса, 2 другого  вкуса) ","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Йогурты для Саши в село","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог детский ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сгущёнка в село","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Свинина не жирная","y":0.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Колбаса, небольшая","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сушки челночёк, средние, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"освежитель воздуха, морской(на квартиру)","y":"2 шт","date":"2021-10-30T21:00:00.000Z"},{"token":"какао(в село и в город)","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-06T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"дыня? ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"огурцы","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"гречка, упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог детский ","y":5,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Свинина не жирная","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб белый(булочки)","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб чёрный, 0,5 буханки чёрного хлеба","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"чай чёрный для города , листовой","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"маленькие батончики шоколадные(для дней рождений)","y":3,"date":"2021-11-06T21:00:00.000Z"},{"token":"кофе молотый для Лёши на ДР","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"детские комбинезоны нательные(хлопковые) с закрытыми пятками и длинными рукавами, на клёпках. Если будут размера 92(не меньше) по цене не дороже 200(250) руб.за штуку","y":2,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"Помидоры ","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"огурцы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"лук репчатый, большие луковицы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":2,"date":"2021-11-10T21:00:00.000Z"},{"token":"молоко детское","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"творог детский","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"говядина","y":0.5,"date":"2021-11-10T21:00:00.000Z"},{"token":"брокколи замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"цветная капуста замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"любой вид","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-13T21:00:00.000Z"},{"token":"груши","y":5,"date":"2021-11-13T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Помидоры ","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"огурцы ","y":2,"date":"2021-11-13T21:00:00.000Z"},{"token":"булгур, пачка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-13T21:00:00.000Z"},{"token":"Творог Можайский, пачка 200г","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"молоко для взрослых, пачек","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"курица","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"фарш домашний, кг","y":0.6,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб чёрный, маленький ","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"туалетная бумага","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Саше","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Оле","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"трусики для Виктории 4 размер большая упаковка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"бананы","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-18T21:00:00.000Z"},{"token":"груши","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"хурма","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"огурцы","y":2,"date":"2021-11-18T21:00:00.000Z"},{"token":"изюм, небольшой пакет","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-18T21:00:00.000Z"},{"token":"Творог Можайский","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"яйцо, десяток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"говядина, лоток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб тостовый?","y":0.5,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб чёрный","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-18T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"крем детский, тюбик(можно купить в воскресенье)","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"бананы","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"виноград","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"груши","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"огурцы","y":5,"date":"2021-11-20T21:00:00.000Z"},{"token":"помидоры","y":8,"date":"2021-11-20T21:00:00.000Z"},{"token":"каши для взрослых, можно просто крупу овсяную и др.","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"курага","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"чернослив","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"сыр мягкий","y":1,"date":"2021-11-20T21:00:00.000Z"}]
// let data = [
// ["IntApp Pricing.Communication",    "2,00",    "Enforcer Scrum meeting.",    "1.26.2021"],
// ["IntApp Pricing.Communication",    "1,00",    "Scrum Release Planning meetings. Discussed tasks with team.",    "1.27.2021"],
// ["IntApp Pricing.Communication",    "1,00",    "Discussed ES plugin Palantiri with Vitaly Sykhov.",    "1.27.2021"],
// ["IntApp Pricing.Development",    "1,00",    "Corrected architecture of PPT-5386.",    "1.27.2021"],
// ["IntApp Pricing.Communication",    "0,50",    "Meeting with Anton Nesterenko about Genus++.",    "1.27.2021"],
// ["IntApp Pricing.Investigation",    "0,50",    "Investigated issue with wrong months values on front end. Discussed results with SK.",    "1.27.2021"],
// ["IntApp Pricing.Development",    "2,00",    "Started to write JobsApiControllerSpringBatchTests with first test.",    "1.27.2021"],
// ["IntApp Pricing.Development",    "1,50",    "Added DateTimeProvider and SpringBatchJobExecutionListener to simplify testing.",    "1.27.2021"],
// ["IntApp Pricing.Communication",    "1,00",    "Story Time meeting. Prepared to it.",    "1.27.2021"],
// ["IntApp Pricing.Communication",    "0,50",    "Enforcer Scrum meeting.",    "1.27.2021"],
// ["IntApp Pricing.Investigation",    "1,00",    "Investigated ways to control Spring Batch job execution flow from tests.",    "1.27.2021"]]
// data = data.map(row => {
//     let result = new Map();
//     for (let i of [0, 1, 2, 3]) {
//         let key =  ['Project-Task', 'Effort', 'Description', 'Date'][i]
//         result.set(key, i == 3 ? new Date(row[i]) : row[i]);
//     }
//     return result
// });
// // data = data.map(x => new Map([['token', x['token']], ['y', x['y']], ['date', new Date(x['date'])]]))

// let tokenizer = new Tokenizer(data, ['Project-Task', 'Effort', 'Description', 'Date']);
// let historiesPerToken = tokenizer.getTokenHistories(Period.MONTHLY)
// console.log(historiesPerToken)
// import { Predict } from './predictor.js'
// let result = Predictor.predict(historiesPerToken, tokenizer, new Date())
// console.log(result)
