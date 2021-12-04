// Predicts 'y' value basing on time series. Locally or with back-end call.
const Predictor = new function() {

    // TODO take from settings.
    /** Round predicted value to this thing. Like 0.1 to use only tens fractions. */
    this.quant = 0.25;
    /** If predicted less that this value then remove token from prediction. */
    this.thresholdNotLess = 0.25;

    /** 
     * Predicts specific day for multiple tokens.
     * @param {Map} historiesPerToken {'token': [number, timestamp], } Tokens and history to predict token value on.
     * @param {Tokenizer} tokenizer Tokenizer object for additional context about data.
     * @param {Date} dateToPredict Date to make prediction for.
     * @returns {Map} Map with predicted {'token': number} rows.
     */
    this.predict = function(historiesPerToken, tokenizer, dateToPredict) {
        // Normilize input data.
        normilizeHistories(historiesPerToken, tokenizer.getNotEmptyHistoryDays());
        // Predict.
        const isLocal = false; // TODO make real switcher.
        let dayPrediction = null;
        if (isLocal) {
            // const maxY = tokenizer.getMaxY();
            dayPrediction = predictDay(historiesPerToken, dateToPredict);
        } else {
            dayPrediction = callBackend(historiesPerToken.entries(), dateToPredict);
        }
        // Normilize predicted values.
        dayPrediction.forEach((y, token, map) => {
            if (y >= this.thresholdNotLess) {
                let yQuantized = Number.parseInt(y * (1 / this.quant)) * this.quant;
                map.set(token, yQuantized);
            }
        })
        return dayPrediction;
    }

    function normilizeHistories(historiesPerToken, notEmptyHistoryDays) {
        const initialSize = historiesPerToken.size;
        const binsLen = 10;
        const binsIn = new Array(binsLen + 1).fill(0); // last element - if more than 'binsLen' items.
        const binsOut = new Array(binsLen + 1).fill(0); // last element - if more than 'binsLen' items.
        historiesPerToken.forEach((history, _) => {
            if (history.length <= binsLen) {
                binsIn[history.length - 1] += 1;
            } else {
                binsIn[binsLen] += 1;
            }
            fillGaps(history, notEmptyHistoryDays);
            if (history.length <= binsLen) {
                binsOut[history.length - 1] += 1;
            } else {
                binsOut[binsLen] += 1;
            }
        });
        console.log("normilizeHistories: from " + initialSize + " made " + historiesPerToken.size
                + " tokens with histogramm (num_rows=received_tokens/normilized_tokens): "
                + binsIn.map((v, i) => {
                    if (i == binsLen) {
                        return "more=" + v + "/" + binsOut[i];
                    }
                    return (i + 1) + "=" + v + "/" + binsOut[i];
                }).join(", "));
    }

    function predictDay(historiesPerToken, dateToPredict) {
        const result = new Map();
        historiesPerToken.forEach((history, token) => {
            let prediction = predictToken(history, dateToPredict);
            if (prediction && prediction > 0) {
                result.set(token, prediction);
            }
        });
        return result
    };

    function fillGaps(data, notEmptyHistoryDays) {
        if (data.length == 1) {
            // If history is presented by single event then it assumed to be the last event.
            // To make model predict the same 'y' for the next time it is required to show a line for it,
            // i.e. enhance history with the same 'y' to previous day.
            data.push([notEmptyHistoryDays[notEmptyHistoryDays.length - 2], data[0][1]]);
        } else {
            // Add '0' to all days between spare days. Assume that if day exists in history then it contains all tokens.
            // If don't add those '0' then model will approximate graph into line between 2 not adjusted points.
            const daysIterator = notEmptyHistoryDays.values();
            // 1) Put first row as is.
            const dataTmp = [data[0]]; // Container of resutl.
            let prevDay = data[0][1]; // Container for previous day.
            // 2) Iterate days iterator until find current day.
            let iteratorResult = daysIterator.next();
            while (iteratorResult.value < prevDay && !iteratorResult.done) {
                iteratorResult = daysIterator.next();
            }
            // 3) Before each next row in data fill gaps with y=0.
            for (let i = 1; i < data.length; i++) {
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
            iteratorResult = daysIterator.next();
            while (!iteratorResult.done) {
                dataTmp.push([0, iteratorResult.value]);
                iteratorResult = daysIterator.next();
            }
            data = dataTmp;
        }
        return data;
    }

    function callBackend(historiesPerToken, dateToPredict) {
        const URL = "https://predictorservice-77yud33tza-nn.a.run.app/predict";
        var options = {
            "method": "POST",
            "contentType": "application/json",
            "payload": JSON.stringify({
                "dateToPredict": dateToPredict,             
                "historiesPerToken": historiesPerToken
            })
        };
        const response = UrlFetchApp.fetch(URL, options);
        console.log("callBackend: response code=" + response.getResponseCode() + ", headers=["
                + Object.entries(response.getAllHeaders()).map((k, v) => k + "=" + v).join(", ") + "]");
        Logger.log(response.getAllHeaders()) //TODO remove
        Logger.log(response.getContentText()) //TODO remove
        return JSON.parse(response.getContentText());
    }

    /**
     * Predicts time series locally.
     * @param {Array} data 2D array with rows [number, Date].
     * @param {Date} dateToPredict Not needed in current realization.
     * @returns Predicted value for specified day.
     */
    function predictToken(data, dateToPredict) {
        const len = data.length
        if (len == 1) {
            return x[0][0]  // just repeat.
        } else {
            const mean = data.reduce((grouped, row) => grouped + row[0], 0) / data.length;
            const trend = data[len - 1][0] - data[len - 2][0];
            return ((data[len - 1][0] - mean) * (data[len - 2][0] - mean) < 0)
                    ? mean
                    : data[len - 1][0] + trend
        }
    };
}