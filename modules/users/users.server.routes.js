'use strict';

module.exports = function (app) {
	// User Routes
	var path = require('path'),
		config = require(path.resolve('./config/config')),
		users = require('./users.server.controller'),
		jwt = require('express-jwt');

	//just using the jwt module to attach the decoded jwt onto the req.user object
	// all other authentication tests are handled on the controller using req.user

	//sms verification
	app.route('/api/users/email')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.post(users.sendVerificationCode);

	app.route('/api/users/verify')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.post(users.verify);

	// Setting up the users profile api
	app.route('/api/users/me')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.get(users.me);

	//
	app.route('/api/users/count')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.get(users.count)

	app.route('/api/users')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.put(users.update);

	app.route('/api/users/accounts')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.delete(users.removeOAuthProvider);

	app.route('/api/users/password')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.post(users.changePassword);

	app.route('/api/users/picture')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
		.post(users.changeProfilePicture);

	// Finish by binding the user middleware
	app.param('userId', users.userByID);
};
