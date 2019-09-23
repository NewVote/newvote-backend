'use strict';

/**
 * Module dependencies.
 */
let config = require('../config'),
    mongoose = require('./mongoose'),
    express = require('./express'),
    chalk = require('chalk'),
    seed = require('./seed');

function seedDB() {
    if (config.seedDB && config.seedDB.seed) {
        console.log(chalk.bold.red('Warning:  Database seeding is turned on'));
        seed.start();
    }
}

// Initialize Models
mongoose.loadModels(seedDB);

module.exports.loadModels = function loadModels() {
    mongoose.loadModels();
};

module.exports.init = function init(callback) {
    mongoose.connect(function (db) {
        // Initialize express
        let app = express.init(db);
        if (callback) callback(app, db, config);
    });
};

module.exports.start = function start() {
    module.exports.init(function (app, db, config) {
        // Start the app by listening on <port>

        app.listen(config.port, function () {
            // Logging initialization
            console.log('--');
            console.log(chalk.green(config.app.title));
            console.log(chalk.green('Environment:\t\t\t' + process.env.NODE_ENV));
            console.log(chalk.green('Port:\t\t\t\t' + config.port));
            console.log(chalk.green('Database:\t\t\t' + config.db.uri));
            console.log(chalk.green('App version:\t\t\t' + config.meanjs.version));
            console.log('--');
        });
    });
};
