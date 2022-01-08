const tokenizer = require('../src/tokenizer.js');

test("checkEts", () => {
    expect(tokenizer.checkEts([])).toBeFalsy();
    expect(tokenizer.checkEts(tokenizer.ETS_COLUMNS.slice(0, -1))).toBeFalsy();
    expect(tokenizer.checkEts(tokenizer.ETS_COLUMNS)).toBeTruthy();
});