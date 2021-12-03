// Predicts 'y' value basing on time series. Locally or with back-end call.
const Predict = new function() {

    // TODO take from settings.
    /** Round predicted value to this thing. Like 0.1 to use only tens fractions. */
    this.quant = 0.25;
    /** If predicted less that this value then remove token from prediction. */
    this.thresholdNotLess = 0.25;

    /** 
     * Predicts specific day for multiple tokens.
     * 
     * @param {Map} historiesPerToken {'token': [number, Date]} Tokens and history to predict token value on.
     * @param {Tokenizer} tokenizer Tokenizer object for additional context about data.
     * @param {Date} dateToPredict Date to make prediction for.
     * @returns {Array} 2D array with predicted [number, Date] rows.
     */
    this.predict = function(historiesPerToken, tokenizer, dateToPredict) {
        let notEmptyHistoryDays = tokenizer.getNotEmptyHistoryDays()
        let dayPrediction = predictDay(historiesPerToken, dateToPredict, notEmptyHistoryDays)
        let maxY = tokenizer.getMaxY();
        let result = []
        dayPrediction.forEach((y, token) => {
            if (y >= this.thresholdNotLess) {
                let yQuantized = Number.parseInt(y * (1 / this.quant)) * this.quant;
                result.push([token, yQuantized])
            }
        })
        return result;
    }

    function predictDay(historiesPerToken, dateToPredict, notEmptyHistoryDays) {
        let result = [];
        const isLocal = false; // TODO make real switcher.
        if (isLocal) {
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
            result = callBackend(JSON.stringify(Array.from(historiesPerToken.entries())), dateToPredict)
        }
        return result
    };

    function callBackend(historiesPerToken, dateToPredict) {
        const URL = "https://predictorservice-77yud33tza-nn.a.run.app/predict";
        var options = {
            "method": "POST",
            "payload": {
                "dateToPredict": dateToPredict,
                'contentType': 'application/json',              
                "historiesPerToken": JSON.stringify(historiesPerToken)
            }
        };
        return UrlFetchApp.fetch(url, options);
    }

    function fillGaps(data, notEmptyHistoryDays) {
        if (data.length == 1) {
            // If history is presented by single event then it assumed to be the last event.
            // To make model predict the same 'y' for the next time it is required to show a line for it,
            // i.e. enhance history with the same 'y' to previous day.
            data.push([notEmptyHistoryDays[notEmptyHistoryDays.length - 2], data[0][1]]);
        } else {
            // Add '0' to all days between spare days. Assume that if day exists in history then it contains all tokens.
            // If don't add those '0' then model will approximate graph into line between 2 not adjusted points.
            // let existingDays = Set(data.map(row => row[1]));
            // let firstDay = data[0][1];
            // let daysToFill = notEmptyHistoryDays.filter(d => d > firstDay).filter(d => !existingDays.includes(d));
            const daysIterator = notEmptyHistoryDays.values();
            // 1) Put first row as is.
            const dataTmp = [data[0]]; // Container of resutl.
            let prevDay = data[0][1]; // Container for previous day.
            // 2) Iterate days iterator until find current day.
            let iteratorResult = null;
            for (iteratorResult = daysIterator.next(); iteratorResult.value < prevDay; );
            // 3) Before each next row in data fill gaps with y=0.
            for (let i = 1; i < data.length - 1; i++) {
                let row = data[i];
                let rowDay = row[1];
                iteratorResult = daysIterator.next();
                while (rowDay > iteratorResult.value || !iteratorResult.done) {
                    dataTmp.push([0, iteratorResult.value]);
                    iteratorResult = daysIterator.next();
                }
                dataTmp.push(row);
            }
            // 4) After data days end continue iterate days with adding y=0 for all remained days.
            while (!iteratorResult.done) {
                dataTmp.push([0, iteratorResult.value]);
                iteratorResult = daysIterator.next();
            }
            data = dataTmp;
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