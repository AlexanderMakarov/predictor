# Predictor

## Plugin

Use https://github.com/google/clasp from "predictor_plugin" folder.

To keep ability use the same code on the GAS and locally TypeScript is not used (though would be great).

Also need to install [Jest](https://jestjs.io/docs/getting-started) and other dependencies for tests: `npm install`.
Tests are executed on git commit or with `npm run test`.
Note that Apps Script doesn't support ECMAScript modules and fails on any `require` or `import` keyword.
Because each from https://github.com/google/clasp/blob/master/docs/typescript.md#the-exports-declaration-workaround
has some drawbacks (like inability to copy-paste as-is from GAS <-> local) then
[transformJsToModule.js](predictor_plugin/transformers/transformJsToModule.js) was implemented and embedded into
[jest.config.json](predictor_plugin/jest.config.json) - it works automatically.

## Service

Install Python dependencies with `pip3 install -r requirements.txt`.

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

- [x] ? Don't jump on 'history' sheet when first time open.
- [ ] Deploy to marketplace.
- [ ] Add tests for logic.
- [ ] Documentation how to use.
- [ ] Show help page on install (together with ^ ?).
- [ ] Add "homepage card" (together with ^ ?).
- [ ] Debug tokens in UI (e.g. highlight in History).
- [ ] Support header not on the first row.
- [ ] Ability to mix trend into prediction ("+1 each week" kinda).
- [ ] Auth with back-end.
- [ ] Mobile support.
- [ ] Support empty lines in prediction and history.
- [ ] Limit history.
- [ ] Ability to deploy images with calculated trends.
- [ ] Predict for specific date.

## Notes for testing

- If try to use TypeScript for GAS plugin tests then it clashes with "src" content written in JavaScript.
- To inject GAS object from test to "src" use `global` like `global.SpreadsheetApp = gasmask.SpreadsheetApp;`
- `jest.createMockFromModule('gasmask')` doesn't allow mock hierarchy so doesn't work - use `require`.
- Rules for mocks with 'gasmask' under Jest:
  - 'gasmask' doesn't provide good enough realization of all nested functions but still helps a lot with structure.
    Need to implement function should return some not 'undefined' value (in most cases).
  - Mock only functions which want to track in `expect` - remained may be implemented directly.