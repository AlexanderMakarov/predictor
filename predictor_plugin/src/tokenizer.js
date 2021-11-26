// Converts spreadsheet data into tables which may be predicted. Works with History and CurrentSheet.
const Tokenizer = new function() {
    // Same name strategy.

    this.Period = {
        DAILY: 1,
        WEEKLY: 7,
        MONTHLY: 30,
        YEARLY: 365,
    }

    /**
     * Tokenizes data with "same token" strategy. Produces token = value from 'token' column.
     * @param {Array} data [{'token': str, 'date': Date, 'y': number}, ...]
     * @param {Period} period Assumed periods to tokenize data for. Affects limitation for old data.
     * @returns {'token': Map({'date': Date, 'y': number})}
     */
    this.getTokenEqualHistories = function(data, period) {
        console.log('getTokenEqualHistories: for ' + period + ' got data=' + data)
        if (!data) {
            return null
        }
        lastDayInData = data[-1]['date']
        result = Map()
        groupBy('token', data).entries().forEach((token, history) => {
            history = limitHistoryByPeriod(history, lastDayInData, period)
            if (!history) {
                result[token] = history
            }
        })
        return result
    }

    this.expandTokenPrediction = new function(token, y) {
        return new Map([['token', token], ['y', y]])
    }

    function groupBy(arr, key) { // https://stackoverflow.com/a/39886097/1535127
        let reducer = (grouped, item) => {
            let group_value = item[key]
            if (!grouped[group_value]) {
                grouped[group_value] = []
            }
            grouped[group_value].push(item)
            return grouped
        }
        return arr.reduce(reducer, {})
    }

    function separateByTasks(data) {
        uniqueTasks = [... new Set(date.map(x => x['task']))]
        return //dict((x, self.df[self.df['task'] == x]) for x in tasks)
    }

    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    function limitHistoryByPeriod(data, lastDayInData, period) {
        // Measure relative to last day in the whole history data, not to "day to predict"!
        //  1. Last occurence shouldn't be older than 30 periods.
        //  2. Max history is 60 periods.
        //  3. At least one row in result.
        //  4. If one row it should be in last day.
        if (!data) {
            return null
        }
        if (data.length == 1 && data[0]['date'] != lastDayInData) { // Check it twice to speed up.
            return null;
        }
        lastDay = data[-1]['date']
        if (Math.ceil(lastDayInData - lastDay) / MS_PER_DAY > 30 * period.value) {
            return null;
        }
        firstDayLimit = lastDayInData - Date(0, 0, 60 * period.value)
        data = data.filter(x => x['date'] > firstDayLimit)
        if (data.isEmpty) {
            return null;
        }
        if (data.length == 1 && data[0]['date'] != lastDayInData) {
            return null;
        }
        return data
    }
}

Tokenizer.getTokenEqualHistories({}, Tokenizer.Period.DAILY)