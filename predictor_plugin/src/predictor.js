// Predicts data locally or with back-end. Calls nobody except back-end.
export const Predict = new function() {

    /** Round predicted value to this thing. Like 0.1 to use only tens fractions. */
    this.quant = 0.25;
    /** If predicted less that this value then remove token from prediction. */
    this.thresholdNotLess = 0.25;

    /** 
     * Predicts specific day.
     * 
     * @param {Map} historiesPerToken {'token': [{'date': Date, 'y': number}]}
     * @param {Tokenizer} tokenizer Tokenizer
     * @param {Date} dateToPredict Date
     * @returns {Array} Rows as 'tokenizer.getNotEmptyHistoryDays' provides + 'date'
     */
    this.predict = function(historiesPerToken, tokenizer, dateToPredict) {
        let notEmptyHistoryDays = tokenizer.getNotEmptyHistoryDays()
        let dayPrediction = predictDay(historiesPerToken, dateToPredict, notEmptyHistoryDays)
        let maxY = tokenizer.getMaxY();
        let result = []
        dayPrediction.forEach((y, token) => {
            if (y >= this.thresholdNotLess) {
                let yQuantized = Number.parseInt(y * (1 / this.quant)) * this.quant;
                let row = tokenizer.expandTokenPrediction(token, Math.min(yQuantized, maxY))
                row.set('date', dateToPredict)
                result.push(row)
            }
        })
        return result;
    }

    function predictDay(historiesPerToken, dateToPredict, notEmptyHistoryDays) {
        let result = new Map();
        const isLocal = true;
        if (isLocal) {
            // local case
            historiesPerToken.forEach((history, token) => {
                history = fillGaps(history, notEmptyHistoryDays)
                let prediction = predictToken(history, dateToPredict)
                if (prediction && prediction > 0) {
                    result.set(token, prediction)
                }
            })
        } else {
            historiesPerToken.forEach((history, token) => {
                fillGaps(history, notEmptyHistoryDays)
            })
            // TODO result = callBackend(historiesPerToken, dateToPredict)
        }

        return result
    };

    function fillGaps(data, notEmptyHistoryDays) {
        // If data for single row then this row is last. To make Prophet predict it next day and with the same 'y' need make
        // line, i.e. add the same 'y' to previous day ONLY.
        if (data.length == 1) {
            data.push(new Map([['date', notEmptyHistoryDays[notEmptyHistoryDays.length - 2]], ['y', data[0].get('y')]]))
        } else {
            // Add '0' to all days between spare days. We expect that if day exists in dataset then it contains all tokens.
            // If don't add those '0' then model will approximate graph into line between 2 not adjusted points.
            let existingDays = Set(data.map(h => h.get('date')))
            let firstDay = data[0].get('date')
            let daysToFill = notEmptyHistoryDays.filter(d => d > firstDay).filter(d => !existingDays.includes(d))
            data.push(...daysToFill.map(d => new Map([['date', d], ['y', 0]])))
        }
        return data;
    }

    /**
     * Predicts time series locally.
     * @param {*} data [Map([['date', Date], ['y', number]]), ...]
     * @param {Date} dateToPredict Not needed in current realization.
     * @returns 
     */
    function predictToken(data, dateToPredict) {
        const len = data.length
        if (len == 1) {
            return x[0].get('y')  // just repeat.
        } else {
            const mean = data.reduce((prev, x) => prev + x.get('y'), 0) / data.length;
            const trend = data[len - 1].get('y') - data[len - 2].get('y')
            return ((data[len - 1].get('y') - mean) * (data[len - 2].get('y') - mean) < 0)
                    ? mean
                    : data[len - 1].get('y') + trend
        }
    };
}