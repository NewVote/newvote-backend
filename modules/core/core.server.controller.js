'use strict';

let path = require('path'),
	config = require(path.resolve('config/config')),
	util = require('util');

/**
 * Render the server error page
 */
exports.renderServerError = function (req, res) {
	res.status(500)
		.json({ message: 'Server Error' });
};

/**
 * Render the server not found responses
 * Performs content-negotiation on the Accept HTTP header
 */
exports.renderNotFound = function (req, res) {
	res.status(404)
		.json({ message: 'Not Found' });
};
