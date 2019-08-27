process.env.NODE_ENV = 'test';

require('./test.spec_helper.js');

let mongooseWrap = require('../config/lib/mongoose.js');
mongooseWrap.loadModels();
mongooseWrap.connect();

let path = require('path');
let config = require(path.resolve('./config/config'));
let server = require('../config/lib/express').init();

// Seed data
const { Seeder } = require('mongo-seeding');

const seedConfig = {
    database: config.db.uri,
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
    .then(() => {
        console.log('Success')
    })
    .catch((err) => {
        console.log(err, 'Import Failed');
    })

server.listen(3000);

module.exports = server;
