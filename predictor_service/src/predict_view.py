from __init__ import app, timeit
from flask import request, jsonify
import logging
import datetime
from __init__ import prophet_runner


HISTORIES_FIELD = 'historiesPerToken'
DATE_FIELD = 'dateToPredict'


@app.route('/predict', methods=['POST'])
def index():
    request_data = request.get_json()
    if not request_data or len(request_data) == 0:
        return jsonify({"error": f"Empty data {request_data}"}), 400
    if HISTORIES_FIELD not in request_data or DATE_FIELD not in request_data:
        return jsonify({
            "error": f"Can't find requried '{HISTORIES_FIELD}' or '{DATE_FIELD}' in {request_data.keys()}"
        }), 400
    return execute_ml(request_data[HISTORIES_FIELD], request_data[DATE_FIELD])


@app.route('/test', methods=["GET"])
def info():
    date = datetime.datetime.now().isoformat()
    return execute_ml({
        'line1': [[1.0, "2021-01-01"], [1.0, "2021-01-02"]],
        'up1': [[0, "2021-01-01"], [1, "2021-01-02"]],
        'down1': [[1, "2021-01-01"], [0, "2021-01-02"]],
        'wave': [
            [0, "2021-01-01"], [0.7, "2021-01-02"], [1, "2021-01-03"],
            [0.7, "2021-01-04"], [0, "2021-01-05"], [0.7, "2021-01-06"],
            [1, "2021-01-07"], [0.7, "2021-01-08"], [0, "2021-01-09"]
        ],
    }, date)


def execute_ml(unit_histories, date):
    day_prediction = {}
    for unit, unit_data in unit_histories.items():
        day_prediction[unit] = timeit(f"Predict {unit}", prophet_runner.predict_unit, unit_data, date)
    return jsonify({
        'predictions': day_prediction,
        'day': date,
    })
