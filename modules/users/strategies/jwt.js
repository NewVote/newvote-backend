'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	config = require(path.resolve('./config/config')),
	passport = require('passport'),
	passportJWT = require('passport-jwt'),
	JWTStrategy = passportJWT.Strategy,
	ExtractJWT = passportJWT.ExtractJwt,
	User = require('mongoose')
	.model('User');

module.exports = function () {
	// Use local strategy
	passport.use(new JWTStrategy({
			jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
			secretOrKey: config.jwtSecret
		},
		function (jwtPayload, done) {
			debugger;
			User.findOne({ _id: jwtPayload._id })
				.then(user => {
					return done(null, user);
				})
				.catch(error => {
					// no token or user found so just make a guest user
					const user = { roles: ['guest'] };
					return done(null, user);
				})
		}, function(err) {
			console.log(err);
		}
	));
};
