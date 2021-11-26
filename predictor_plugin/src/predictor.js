// Predicts data locally or with back-end. Calls nobody except back-end.
const Predict = new function() {

    /** Round predicted value to this thing. Like 0.1 to use only tens fractions. */
    this.quant = 0.25;
    /** If predicted less that this value then remove token from prediction. */
    this.thresholdNotLess = 0.25;

    /** 
     * Predicts specific day.
     * 
     * @param {Map} historiesPerToken {'token': [{'date': Date, 'y': number}]}
     * @param {Tokenizer} tokenizer Tokenizer
     * @param dateToPredict Date
     */
    this.predict = new function(historiesPerToken, tokenizer, dateToPredict) {
        let dayPrediction = _predictDay(historiesPerToken, dateToPredict, notEmptyHistoryDays)
        let maxY = Math.max.apply(Math, array.map(history => Math.max(history.values)));
        return dayPrediction.entries()
            .filter((token, y) => y >= thresholdNotLess)
            .map((token, y) => {
                let yQuantized = Number.parseInt(v * (1 / quant)) * quant;
                let row = tokenizer.expandTokenPrediction(token, Math.min(yQuantized, maxY))
                row['date'] = dateToPredict
                return row
            })
            .collect()
    }

    function predictDay(historiesPerToken, date, notEmptyHistoryDays) {
        // local case
        return historiesPerToken.map((token, history) => predictToken(history, date, notEmptyHistoryDays))
    };

    function predictToken(data, date, notEmptyHistoryDays) {
        // If df for single row then this row is last. To make Propher predict it next day and with the same 'y' need make
        // line, i.e. add the same 'y' to previous day.
        if (data.length == 1) {
            data.push(new Map([['date', notEmptyHistoryDays[-2]], ['y', data[0]['y']]]))
        } else {
            // Add '0' to all days between spare events. We expect that if day exists in dataset then it contains all tokens.
            // If don't add those '0' then model will approximate graph into line between 2 not adjusted points.
            let existingDays = Set(data.map(h => h['date']))
            let firstDay = data[0]['date']
            let daysToFill = notEmptyHistoryDays.filter(d => d > firstDay).filter(d => !existingDays.includes(d))
            data.push(...daysToFill.map(d => new Map([['date', d], ['y', 0]])))
        }
        return predict(data, date)
    };

    function predict(data, date) {
        const mean = data[-1]['y']
        return data[-1]['y']
    };
}