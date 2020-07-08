let EJSON = require('mongodb-extjson')
let doc = require('./issues.seed.json')

doc = EJSON.stringify(doc)
doc = EJSON.parse(doc)

module.exports = doc
