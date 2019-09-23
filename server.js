'use strict';
/**
 * Module dependencies.
 */
require('newrelic');
const throng = require('throng');
const app = require('./config/lib/app');
const sticky = require('sticky-session');

/**
 * Module variables.
 */
const WORKERS = process.env.WEB_CONCURRENCY || 1;

/**
 * Start the app
 */
if (process.env.NODE_ENV === 'development') {
    console.log('starting without throng');
    app.start();
} else {

    require('sticky-cluster')(
        function (callback) {
            app.init(function (app, db, config) {

                callback(app);
            })
        }, {
            concurrency: WORKERS,
            port: process.env.PORT
        }

    )
    // throng({
    //     workers: WORKERS,
    //     lifetime: Infinity
    // },
    // app.start
    // );
}
