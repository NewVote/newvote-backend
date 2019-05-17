'use strict';
/**
 * Module dependencies.
 */
const throng = require('throng');
const app = require('./config/lib/app');
require ('newrelic');

/**
 * Module variables.
 */
const WORKERS = process.env.WEB_CONCURRENCY || 1;

/**
 * Start the app
 */
throng({
	workers: WORKERS,
	lifetime: Infinity
}, app.start);
