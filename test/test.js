process.env.NODE_ENV = 'test';

require('./test.spec_helper.js');

let mongooseWrap = require('../config/lib/mongoose.js');
mongooseWrap.loadModels();
mongooseWrap.connect();

var path = require('path');
var config = require(path.resolve('./config/config'));
var server = require('../config/lib/express').init();

// Seed data
const { Seeder } = require('mongo-seeding');

const seedConfig = {
    database: 'mongodb://localhost:27017/newvote-test',
    dropDatabase: true
}

const seeder = new Seeder(seedConfig);
const collectionReadingOptions = {
    extensions: ['js']
};

const collections = seeder.readCollectionsFromPath(
    path.resolve('./seed'),
    collectionReadingOptions
);

seeder.import(collections)
    .then(res => {
        console.log(res, 'this is res');
    })
    .catch((err) => {
        console.log(err, 'this is err');
    })

server.listen(3000);

module.exports = server;
