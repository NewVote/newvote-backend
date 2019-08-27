'use strict';
/**
 * Module dependencies.
 */
require('newrelic');
const throng = require('throng');
const app = require('./config/lib/app');

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
    throng(
        {
            workers: WORKERS,
            lifetime: Infinity
        },
        app.start
    );
}
