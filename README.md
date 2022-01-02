# Predictor

## Plugin

https://github.com/google/clasp

## Service

Run `setup.py`.

### Setup

Run `setup.py`.

### Run

Cd to "predictor_service/src" and execute `run.py`.

Execute in browser something like "http://127.0.0.1:5000/test".


### Run from Docker

```
$ cd predictor_service
$ docker run -e PORT=8080 -t -p 8080:8080 predictor_service
```

### Deploy into GCP

Note `gcloud run deploy --timeout 30m` doesn't help - still 10m timeout.

```
$ cd predictor_service
$ docker build -t predictor_service .
$ docker tag predictor_service:latest gcr.io/predictor-333317/predictor_service
$ gcloud auth configure-docker
$ docker push gcr.io/predictor-333317/predictor_service
$ gcloud run deploy predictorservice --image gcr.io/predictor-333317/predictor_service
```

Next on each update:
```
$ docker build -t predictor_service .
$ docker tag predictor_service:latest gcr.io/predictor-333317/predictor_service
$ docker push gcr.io/predictor-333317/predictor_service
$ gcloud run deploy predictorservice --image gcr.io/predictor-333317/predictor_service
```

## TODO
[ ] ? Don't jump on 'history' sheet when first time open.
[ ] Deploy to marketplace.
[ ] Documentation how to use.
[ ] Show help page on install (together with ^ ?).
[ ] Add "homepage card" (together with ^ ?).
[ ] Ability to mix trend into prediction ("+1 each week" kinda).
[ ] Auth with back-end.
[ ] Mobile support.
[ ] Support empty lines in prediction and history.
[ ] Limit history.
[ ] Ability to deploy images with calculated trends.