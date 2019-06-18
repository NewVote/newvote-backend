process.env.NODE_ENV = 'test';

require('./test.spec_helper.js');

let mongooseWrap = require('../config/lib/mongoose.js');
mongooseWrap.loadModels();
mongooseWrap.connect();

var path = require('path');
var config = require(path.resolve('./config/config'));
var server = require('../config/lib/express').init();

server.listen(3000);

module.exports = server;

// var userFromSeedConfig = config.seedDB.options.seedUser;
// var adminFromSeedConfig = config.seedDB.options.seedAdmin;

