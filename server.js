'use strict';
/**
 * Module dependencies.
 */
const throng = require('throng');
const app = require('./config/lib/app');

/**
 * Module variables.
 */
const WORKERS = process.env.WEB_CONCURRENCY || 3;
// var server = app.start();

/**
 * Start the app
 */
throng({
	workers: WORKERS,
	lifetime: Infinity
}, app.start);
