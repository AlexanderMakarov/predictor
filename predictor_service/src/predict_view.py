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
        'line1': [{'ds': '2021-11-01', 'y': 1.0}, {'ds': '2021-11-02', 'y': 1.0}],
        'up1': [{'ds': '2021-11-01', 'y': 0.0}, {'ds': '2021-11-02', 'y': 1.0}],
        'down1': [{'ds': '2021-11-01', 'y': 1.0}, {'ds': '2021-11-02', 'y': 0.0}],
        'wave': [
            {'ds': '2021-11-01', 'y': 0.0}, {'ds': '2021-11-02', 'y': 0.7}, {'ds': '2021-11-03', 'y': 1.0},
            {'ds': '2021-11-04', 'y': 0.7}, {'ds': '2021-11-05', 'y': 0.0}, {'ds': '2021-11-06', 'y': 0.7},
            {'ds': '2021-11-07', 'y': 1.0}, {'ds': '2021-11-08', 'y': 0.7}
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
