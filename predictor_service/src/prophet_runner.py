import prophet
import logging
import os
import typing
import pandas as pd
from __init__ import timeit


def predict_unit(history: typing.List[dict], date: str) -> float:
    data = pd.DataFrame(history, columns=['y', 'ds'])
    data['ds'] = pd.DatetimeIndex(data['ds'])
    with suppress_stdout_stderr():  # PyStan generates a lot of logs from cpp - so no control on it.
        return run_prophet(data, date)


def run_prophet(df: pd.DataFrame, date: str) -> float:
    # FYI: changepoint_prior_scale 0.05->0.2 doesn't affect speed.
    # 6x speed up with uncertainty_samples=None.
    # For more see https://towardsdatascience.com/how-to-run-facebook-prophet-predict-x100-faster-cce0282ca77d
    pf = prophet.Prophet(uncertainty_samples=None)
    model = timeit(f"Train", pf.fit, df)
    future = pd.DataFrame((pd.to_datetime(date),), columns=['ds'])
    forecast = model.predict(future)
    return forecast.at[0, 'yhat']  # 0 index because only one row was asked.


# https://stackoverflow.com/a/56695622/1535127 - they only way shut up PyStan.
class suppress_stdout_stderr(object):
    '''
    A context manager for doing a "deep suppression" of stdout and stderr in
    Python, i.e. will suppress all print, even if the print originates in a
    compiled C/Fortran sub-function.
       This will not suppress raised exceptions, since exceptions are printed
    to stderr just before a script exits, and after the context manager has
    exited (at least, I think that is why it lets exceptions through).

    '''
    def __init__(self):
        # Open a pair of null files
        self.null_fds = [os.open(os.devnull, os.O_RDWR) for x in range(2)]
        # Save the actual stdout (1) and stderr (2) file descriptors.
        self.save_fds = (os.dup(1), os.dup(2))

    def __enter__(self):
        # Assign the null pointers to stdout and stderr.
        os.dup2(self.null_fds[0], 1)
        os.dup2(self.null_fds[1], 2)

    def __exit__(self, *_):
        # Re-assign the real stdout/stderr back to (1) and (2)
        os.dup2(self.save_fds[0], 1)
        os.dup2(self.save_fds[1], 2)
        # Close the null files
        os.close(self.null_fds[0])
        os.close(self.null_fds[1])