const CONST_REGEXP = /^(const|function|class) (\w+?)[( ]+.*/gm;

module.exports = {
    process(sourceText, sourcePath, options) {
        const tokensToExport = [];
        for (const result of sourceText.matchAll(CONST_REGEXP)) {
            tokensToExport.push(result[2]);
        }
        console.log("transformJsToModule: in '" + sourcePath + "' found following exportable tokens: " + tokensToExport);
        const tokensArrayInString = '{'
                 + tokensToExport.map((token) => '\n    "' + token + '": ' + token).join(',')
                 + '\n}';
        return sourceText + '\nmodule.exports = ' + tokensArrayInString + ';';
    },
};