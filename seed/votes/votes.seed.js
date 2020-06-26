let EJSON = require('mongodb-extjson')
let doc = require('./votes.seed.json')

doc = EJSON.stringify(doc)
doc = EJSON.parse(doc)

module.exports = doc
