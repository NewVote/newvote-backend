let EJSON = require('mongodb-extjson')
let doc = require('./media.seed.json')

doc = EJSON.stringify(doc)
doc = EJSON.parse(doc)

module.exports = doc
