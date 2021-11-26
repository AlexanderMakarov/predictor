from flask import Flask
import logging
import datetime
import typing


app = Flask('planner')
app.config['JSON_SORT_KEYS'] = False
logging.basicConfig(level=logging.DEBUG)


def timeit(name:str, func, *args) -> typing.Any:
    start_time = datetime.datetime.now()
    result = func(*args)
    logging.debug(f"{name} took {datetime.datetime.now() - start_time}.")
    return result


import prophet_runner
import predict_view
