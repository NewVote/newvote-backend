'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	config = require(path.resolve('./config/config')),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	nodemailer = require('nodemailer'),
	async = require('async'),
	Recaptcha = require('recaptcha-verify'),
	crypto = require('crypto');

var recaptcha = new Recaptcha({
	secret: config.reCaptcha.secret,
	verbose: true
});

var smtpTransport = nodemailer.createTransport(config.mailer.options);

/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = function (req, res, next) {
	async.waterfall([
	// check recaptcha is valid and present
	function (done) {
			const { recaptchaResponse } = req.body;
			recaptcha.checkResponse(recaptchaResponse, function (err, response) {
				debugger;
				if(err || !response.success) {
					return res.status(400)
						.send({
							message: 'Recaptcha verification failed.'
						});
				} else {
					done()
				}
			})
	},
    // Generate random token
    function (done) {
			crypto.randomBytes(20, function (err, buffer) {
				var token = buffer.toString('hex');
				done(err, token);
			});
    },
    // Lookup user by username
    function (token, done) {
			if(req.body.email) {
				User.findOne({
					email: req.body.email
				}, '-salt -password -verificationCode', function (err, user) {
					if(!user) {
						return res.status(400)
							.send({
								message: 'No account with that username has been found'
							});
					} else if(user.provider !== 'local') {
						return res.status(400)
							.send({
								message: 'It seems like you signed up using your ' + user.provider + ' account'
							});
					} else {
						user.resetPasswordToken = token;
						user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

						user.save(function (err) {
							done(err, token, user);
						});
					}
				});
			} else {
				return res.status(400)
					.send({
						message: 'Username field must not be blank'
					});
			}
    },
    function (token, user, done) {
			res.render(path.resolve('modules/users/templates/reset-password-email'), {
				name: user.email,
				appName: config.app.title,
				url: `${req.headers.referer}/${token}/${user.email}`
			}, function (err, emailHTML) {
				done(err, emailHTML, user);
			});
    },
    // If valid email, send reset email using service
    function (emailHTML, user, done) {
			var mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Password Reset',
				html: emailHTML
			};
			smtpTransport.sendMail(mailOptions, function (err) {
				if(!err) {
					return res.send({
						message: 'An email has been sent to the provided address with further instructions.'
					});
				} else {
					return res.status(400)
						.send({
							message: 'Failure sending email: ' + err
						});
				}

				done(err);
			});
    }
  ], function (err) {
		if(err) {
			return next(err);
		}
	});
};

/**
 * Reset password POST from email token
 */
exports.reset = function (req, res, next) {
	// Init Variables
	var passwordDetails = req.body;
	var message = null;

	async.waterfall([

    function (done) {
			// find a user with matching email + token + expiry date
			User.findOne({
				email: passwordDetails.email,
				resetPasswordToken: passwordDetails.token,
				resetPasswordExpires: {
					$gt: Date.now() - 3600000 // 1 hour
				}
			}, function (err, user) {
				if(!err && user) {
					if(passwordDetails.newPassword === passwordDetails.verifyPassword) {
						user.password = passwordDetails.newPassword;
						// user.resetPasswordToken = undefined;
						// user.resetPasswordExpires = undefined;

						user.save(function (err) {
							if(err) {
								return res.status(400)
									.send({
										message: errorHandler.getErrorMessage(err)
									});
							} else {
								done(null, user)
							}
						});
					} else {
						return res.status(400)
							.send({
								message: 'Passwords do not match'
							});
					}
				} else {
					return res.status(400)
						.send({
							message: 'Password reset token is invalid or has expired.'
						});
				}
			});
    },
    function (user, done) {
			res.render('modules/users/templates/reset-password-confirm-email', {
				name: user.email,
				appName: config.app.title
			}, function (err, emailHTML) {
				done(err, emailHTML, user);
			});
    },
    // If valid email, send reset email using service
    function (emailHTML, user, done) {
			var mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Your password has been changed',
				html: emailHTML
			};

			smtpTransport.sendMail(mailOptions, function (err) {
				if(!err) {
					return res.send({
						message: 'Password reset successfully.'
					});
				} else {
					done(err, 'done');
				}
			});
    }
  ], function (err) {
		if(err) {
			return next(err);
		}
	});
};

/**
 * Change Password
 */
exports.changePassword = function (req, res, next) {
	// Init Variables
	var passwordDetails = req.body;
	var message = null;

	if(req.user) {
		if(passwordDetails.newPassword) {
			User.findById(req.user.id, function (err, user) {
				if(!err && user) {
					if(user.authenticate(passwordDetails.currentPassword)) {
						if(passwordDetails.newPassword === passwordDetails.verifyPassword) {
							user.password = passwordDetails.newPassword;

							user.save(function (err) {
								if(err) {
									return res.status(400)
										.send({
											message: errorHandler.getErrorMessage(err)
										});
								} else {
									req.login(user, function (err) {
										if(err) {
											res.status(400)
												.send(err);
										} else {
											res.send({
												message: 'Password changed successfully'
											});
										}
									});
								}
							});
						} else {
							res.status(400)
								.send({
									message: 'Passwords do not match'
								});
						}
					} else {
						res.status(400)
							.send({
								message: 'Current password is incorrect'
							});
					}
				} else {
					res.status(400)
						.send({
							message: 'User is not found'
						});
				}
			});
		} else {
			res.status(400)
				.send({
					message: 'Please provide a new password'
				});
		}
	} else {
		res.status(400)
			.send({
				message: 'User is not signed in'
			});
	}
};
