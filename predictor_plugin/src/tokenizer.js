// Converts spreadsheet data into tables which may be predicted. Works with History and CurrentSheet.

const Period = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    YEARLY: 365,
}

function groupBy(arr, key) { // https://stackoverflow.com/a/39886097/1535127 updated for Map
    let reducer = (grouped, item) => {
        let group_value = item.get(key)
        if (!grouped[group_value]) {
            grouped.set(group_value, [])
        }
        grouped.get(group_value).push(item)
        return grouped
    }
    return arr.reduce(reducer, new Map())
}

function logMapElements(value, key, map) {
    console.log(`m[${key}] = ${value}`);
}

function substractDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DATE_WORDS = ['date', 'дата', 'time', 'день', 'когда']
const Y_WORDS = ['quantity', 'количество', 'кол-во', 'кол', 'сколько', 'number', 'qnty', 'count', 'y']
const ETS_COLUMNS = ['project-task', 'effort', 'description', 'date']
const SEPARATOR = "###"

class Tokenizer {
    // Same name strategy.

    /**
     * Concstructor.
     * @param {Array} data [Map{'token': str, 'date': Date, 'y': number}, ...]
     * @param {Array} headers [str, ...] in order of appearance in sheet.
     */
    constructor(data, headers) {
        this.data = data;
        this.headers = headers;
        this.isEts = headers.map(h => h.toLowerCase()).toString() == ETS_COLUMNS.toString()
    }

    /**
     * Tokenizes data with "same token" strategy. Produces token = value from 'token' column.
     * @param {Array} data [{'token': str, 'date': Date, 'y': number}, ...]
     * @param {Period} period Assumed periods to tokenize data for. Affects limitation for old data.
     * @returns {'token': Map({'date': Date, 'y': number})}
     */
    getTokenHistories(period) {
        if (!this.data) {
            return null;
        }
        console.log('getTokenHistories: for period=' + period + ' got ' + this.data.length + ' rows data')
        this.dateColumn = this.findSpecificColumn(DATE_WORDS, true);
        this.yColumn = this.findSpecificColumn(Y_WORDS, false);
        let lastDayInData = this.data[this.data.length - 1].get(this.dateColumn)
        // TODO separate infinetily. For now only "one column" and "ETS" cases.
        let groupedData = null // {token: [Map{...}]}
        if (this.isEts) {
            groupedData = new Map()
            groupBy(this.data, this.headers[0]).forEach((taskHistory, task) => { // Group by task.
                // let uniqueDesc = history.reduce((grouped, x) => grouped.add(x.get(this.headers[2])), new Set())
                if (taskHistory && taskHistory.length > 0) {
                    let groupedInTask = groupBy(taskHistory, this.headers[2]) // Next group by description.
                    groupedInTask.forEach((descHistory, desc) => {
                        let token = task + SEPARATOR + desc; // Build token from 2 columns.
                        groupedData.set(token, descHistory)
                    })
                }
            })
        } else {
            let unitCol = this.headers.filter(
                    h => h.toLowerCase() != this.dateColumn && h.toLowerCase() != this.yColumn)[0];
            groupedData = groupBy(this.data, unitCol)
        }
        console.log("getTokenHistories: found " + groupedData.size + " unique tokens, limiting them...")
        let result = new Map()
        groupedData.forEach((history, token) => {
            history = this.limitHistoryByPeriod(history, lastDayInData, period)
            if (history && history.length > 0) {
                result.set(token, history)
            }
        })
        console.log('getTokenHistories: ending up with ' + result.size + ' tokens=' + Array.from(result.keys()))
        return result
    }

    limitHistoryByPeriod(data, lastDayInData, period) {
        // Measure relative toperiodw in result.
        //  4. If one row it should be in last day.
        if (!data) {
            return null
        }
        if (data.length == 1 && data[0].get(this.dateColumn).getTime() != lastDayInData.getTime()) { // Check it twice to speed up.
            return null;
        }
        let lastDay = data[data.length - 1].get(this.dateColumn)
        if (Math.ceil(lastDayInData - lastDay) / MS_PER_DAY > 30 * period) {
            return null;
        }
        let dayNotOlderThan = substractDays(lastDayInData, 60 * period)
        data = data.filter(x => x.get(this.dateColumn) >= dayNotOlderThan)
        if (data.isEmpty) {
            return null;
        }
        if (data.length == 1 && data[0].get(this.dateColumn).getTime() != lastDayInData.getTime()) {
            return null;
        }
        return data
    }

    expandTokenPrediction(token, y) {
        if (this.isEts) {
            let parts = token.split(SEPARATOR)
            return new Map([[ETS_COLUMNS[0], parts[0]], [ETS_COLUMNS[1], y], [ETS_COLUMNS[2], parts[1]]])
        }
        return new Map([[this.unitCol, token], [this.yColumn, y]])
    }

    getMaxY() {
        return Math.max.apply(Math, this.data.map(row => row.get(this.dateColumn)));
    }

    getNotEmptyHistoryDays() {
        // Should be sorted.
        return Array.from(this.data.reduce((grouped, x) => grouped.add(x.get(this.dateColumn)), new Set())).sort()
    }

    findSpecificColumn(words, isSearchShortest) {
        // 1 step - find all columns possible.
        let columnsWithWord = {}
        this.headers.map((column, index) => {
            let c = column.toLowerCase();
            words.forEach((word) => { // Save all possible columns.
                if (c == word) {
                    columnsWithWord[column] = index;
                }
            })
        })
        console.log("findSpecificColumn: '" + words + "' column in '" + this.headers + "' - got " + columnsWithWord + ".")
        if (columnsWithWord.length == 1) {
            return columnsWithWord.keys()[0]
        } else if (columnsWithWord.length == 0) {
            return null
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
        return column
    }
}

// let data = [{"token":"бананы","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Рис, пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Каша для взрослых, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курага, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Чернослив, большой пакет","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Яйцо куриное, десяток","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творожки Даниссимо(2 одного вкуса, 2 другого  вкуса) ","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Йогурты для Саши в село","y":4,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог детский ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сгущёнка в село","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Свинина не жирная","y":0.5,"date":"2021-10-30T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Колбаса, небольшая","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"Сушки челночёк, средние, упаковка","y":1,"date":"2021-10-30T21:00:00.000Z"},{"token":"освежитель воздуха, морской(на квартиру)","y":"2 шт","date":"2021-10-30T21:00:00.000Z"},{"token":"какао(в село и в город)","y":2,"date":"2021-10-30T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-10-30T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-06T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"дыня? ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Помидоры ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"огурцы","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"гречка, упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог детский ","y":5,"date":"2021-11-06T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"Фарш под названием \"домашний\" или куринный","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Свинина не жирная","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Курица ","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб тостовый","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"Круассаны простые или с молочной начинкой, только производство Ашан","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб белый(булочки)","y":4,"date":"2021-11-06T21:00:00.000Z"},{"token":"хлеб чёрный, 0,5 буханки чёрного хлеба","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"чай чёрный для города , листовой","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"маленькие батончики шоколадные(для дней рождений)","y":3,"date":"2021-11-06T21:00:00.000Z"},{"token":"кофе молотый для Лёши на ДР","y":1,"date":"2021-11-06T21:00:00.000Z"},{"token":"детские комбинезоны нательные(хлопковые) с закрытыми пятками и длинными рукавами, на клёпках. Если будут размера 92(не меньше) по цене не дороже 200(250) руб.за штуку","y":2,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре мясо+овощи ","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-06T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"Помидоры ","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"огурцы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"лук репчатый, большие луковицы","y":3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-10T21:00:00.000Z"},{"token":"Творог Можайский 200гр пачка","y":2,"date":"2021-11-10T21:00:00.000Z"},{"token":"молоко детское","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"творог детский","y":5,"date":"2021-11-10T21:00:00.000Z"},{"token":"Молоко 1л упаковка","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"говядина","y":0.5,"date":"2021-11-10T21:00:00.000Z"},{"token":"брокколи замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"цветная капуста замороженные пакет","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"Колбаса или ветчина небольшая","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"любой вид","y":0.4,"date":"2021-11-10T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"большой сканворд (для тётушки на ДР)","y":1,"date":"2021-11-10T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-13T21:00:00.000Z"},{"token":"груши","y":5,"date":"2021-11-13T21:00:00.000Z"},{"token":"лимон","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Помидоры ","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"огурцы ","y":2,"date":"2021-11-13T21:00:00.000Z"},{"token":"булгур, пачка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-13T21:00:00.000Z"},{"token":"Творог Можайский, пачка 200г","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"молоко для взрослых, пачек","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"курица","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"фарш домашний, кг","y":0.6,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб тостовый?","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"хлеб чёрный, маленький ","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"туалетная бумага","y":4,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Саше","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"зимние ботинки Оле","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"пюре рыбное","y":6,"date":"2021-11-13T21:00:00.000Z"},{"token":"трусики для Виктории 4 размер большая упаковка","y":1,"date":"2021-11-13T21:00:00.000Z"},{"token":"бананы","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"виноград","y":0.4,"date":"2021-11-18T21:00:00.000Z"},{"token":"груши","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"хурма","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"огурцы","y":2,"date":"2021-11-18T21:00:00.000Z"},{"token":"изюм, небольшой пакет","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":0.3,"date":"2021-11-18T21:00:00.000Z"},{"token":"Творог Можайский","y":0.6,"date":"2021-11-18T21:00:00.000Z"},{"token":"яйцо, десяток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"говядина, лоток","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб тостовый?","y":0.5,"date":"2021-11-18T21:00:00.000Z"},{"token":"хлеб чёрный","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"булочки пшеничные","y":4,"date":"2021-11-18T21:00:00.000Z"},{"token":"жидкость для опрыскивания стёкол и фар для машины","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"крем детский, тюбик(можно купить в воскресенье)","y":1,"date":"2021-11-18T21:00:00.000Z"},{"token":"бананы","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"виноград","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"груши","y":0.5,"date":"2021-11-20T21:00:00.000Z"},{"token":"огурцы","y":5,"date":"2021-11-20T21:00:00.000Z"},{"token":"помидоры","y":8,"date":"2021-11-20T21:00:00.000Z"},{"token":"каши для взрослых, можно просто крупу овсяную и др.","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"курага","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"чернослив","y":2,"date":"2021-11-20T21:00:00.000Z"},{"token":"Сыр твёрдый ","y":1,"date":"2021-11-20T21:00:00.000Z"},{"token":"сыр мягкий","y":1,"date":"2021-11-20T21:00:00.000Z"}]
let data = [
["IntApp Pricing.Communication",    "2,00",    "Enforcer Scrum meeting.",    "1.26.2021"],
["IntApp Pricing.Communication",    "1,00",    "Scrum Release Planning meetings. Discussed tasks with team.",    "1.27.2021"],
["IntApp Pricing.Communication",    "1,00",    "Discussed ES plugin Palantiri with Vitaly Sykhov.",    "1.27.2021"],
["IntApp Pricing.Development",    "1,00",    "Corrected architecture of PPT-5386.",    "1.27.2021"],
["IntApp Pricing.Communication",    "0,50",    "Meeting with Anton Nesterenko about Genus++.",    "1.27.2021"],
["IntApp Pricing.Investigation",    "0,50",    "Investigated issue with wrong months values on front end. Discussed results with SK.",    "1.27.2021"],
["IntApp Pricing.Development",    "2,00",    "Started to write JobsApiControllerSpringBatchTests with first test.",    "1.27.2021"],
["IntApp Pricing.Development",    "1,50",    "Added DateTimeProvider and SpringBatchJobExecutionListener to simplify testing.",    "1.27.2021"],
["IntApp Pricing.Communication",    "1,00",    "Story Time meeting. Prepared to it.",    "1.27.2021"],
["IntApp Pricing.Communication",    "0,50",    "Enforcer Scrum meeting.",    "1.27.2021"],
["IntApp Pricing.Investigation",    "1,00",    "Investigated ways to control Spring Batch job execution flow from tests.",    "1.27.2021"]]
data = data.map(row => {
    let result = new Map();
    for (let i of [0, 1, 2, 3]) {
        let key =  ['Project-Task', 'Effort', 'Description', 'Date'][i]
        result.set(key, i == 3 ? new Date(row[i]) : row[i]);
    }
    return result
});
// data = data.map(x => new Map([['token', x['token']], ['y', x['y']], ['date', new Date(x['date'])]]))

let tokenizer = new Tokenizer(data, ['Project-Task', 'Effort', 'Description', 'Date']);
let historiesPerToken = tokenizer.getTokenHistories(Period.MONTHLY)
console.log(historiesPerToken)
import { Predict } from './predictor.js'
let result = Predict.predict(historiesPerToken, tokenizer, new Date())
console.log(result)
