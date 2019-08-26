'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	path = require('path'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	config = require(path.resolve('./config/config')),
	querystring = require('querystring'),
	nodemailer = require('nodemailer'),
	transporter = nodemailer.createTransport(config.mailer.options),
	jwt = require('jsonwebtoken'),
	request = require('request');

/**
 * User middleware
 */

exports.sendVerificationCodeViaSms = function (req, res, next) {
	const { user } = req
	const { number } = req.body;
	const code = User.generateVerificationCode();

	console.log(`sending code ${code} to number ${number}`);
	let options = {
		'uri': 'https://api.smsbroadcast.com.au/api-adv.php',
		'qs': {
			'username': config.smsBroadcast.username,
			'password': config.smsBroadcast.password,
			'to': number,
			'from': 'NewVote',
			'message': `Your NewVote verification code is ${code}`
		},
		useQueryString: true
	};

	request.get(options, function (error, response, body) {
		if(error) {
			return res.status(400)
				.send({ message: 'There was a problem sending your verification code: ' + error });
		}

		if(response.statusCode == 200) {
			let responseMessage = body.split(':');
			if(responseMessage[0] == 'OK') {
				return saveVerificationSmsCode(user, code, number, res);
			} else if(responseMessage[0] == 'BAD') {
				return res.status(400)
					.send({ message: 'There was a problem sending your verification code, please make sure the phone number you have entered is correct.' });
			} else if(responseMessage[0] == 'ERROR') {
				console.log('SMS BROADCAST ERROR: ' + responseMessage[1]);
				return res.status(400)
					.send({ message: 'There was a problem sending your verification code. There was an internal server error, please try again later.' });
			} else {
				console.log('SMS BROADCAST ERROR: ' + responseMessage[1]);
				return res.status(400)
					.send({ message: 'Something went wrong: ' + responseMessage[1] });
			}
		} else {
			return res.status(response.statusCode)
				.send({ message: 'There was a problem contacting the server.' });
		}
	});
}

exports.sendVerificationCodeViaEmail = function (req, res) {
	// ;
	let user = req.user;
	let email = user.email;
	let pass$ = User.generateRandomPassphrase()

	//send code via sms
	return pass$.then(pass => saveEmailVerificationCode(user, pass))
		// .then(pass => sendEmail(user, pass, req))g
		.then((data) => {
			console.log('Succesfully sent a verification e-mail: ', data);
			return res.status(200)
				.send({ message: 'success' })
		})
		.catch((err) => {
			console.log('error sending verification email: ', err);
			return res.status(400)
				.send({
					message: 'There was a problem while sending your verification e-mail, please try again later.'
				});
		});
};

function saveVerificationSmsCode(user, code, number, res) {
	return User.findById(user._id)
		.then((user) => {
			if(!user) {
				throw Error('We could not find the user in the database. Please contact administration.');
			}

			//add hashed code to users model
			user.verificationCode = user.hashVerificationCode(code);
			user.mobileNumber = number;

			//update user model
			return user.save()
				.then((err) => {
					return res.json({ 'message': 'success' });
				})
				.catch(err => {
					console.log('error saving user: ', err);
					return res.status(400)
						.send({
							message: err
						});
				});
		});
}

function saveEmailVerificationCode(user, code) {
	//get the actual user because we need the salt
	//because we need the salt
	//because we need the salt
	//because we need the salt

	return User.findById(user.id)
		.then((user) => {
			if(!user) {
				throw Error('We could not find the user in the database. Please contact administration.');
			}

			//add hashed code to users model
			user.verificationCode = user.hashVerificationCode(code);

			//update user model
			return user.save()
				.then(() => code);
		});
}

exports.verify = function (req, res) {
	const reqUser = req.user;
	const { code } = req.body

	console.log(`Trying to verify ${code}`);

	//get the actual user because we need the salt
	User.findById(reqUser._id)
		.then((user) => {
			if (!user) throw('We could not find the user in the database. Please contact administration.')

			//add hashed code to users model
			const verified = user.verify(code);

			if (!verified) throw('Verification code was incorrect.')
			
			//update user model
			user.verified = true;
			if(!user.roles.includes('user')){
				user.roles.push('user');
			}
			
			return user.save()
		})
		.then((user) => {
			user.salt = undefined;
			user.password = undefined;
			user.verificationCode = undefined;
			// send a new token with new verified status
			const payload = { _id: user._id, roles: user.roles, verified: user.verified };
			const token = jwt.sign(payload, config.jwtSecret, { 'expiresIn': config.jwtExpiry });
			return res.json({ user: user, token: token });
		})
		.catch((err) => {
			console.log('error finding user: ', err);
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		});
};

let buildMessage = function (user, code, req) {
	let messageString = '';
	let url = req.protocol + '://' + req.get('host') + '/verify/' + code;

	messageString += `<h3> Welcome ${user.firstName} </h3>`;
	messageString += `<p>Thank you for joining the NewVote platform, you are almost ready to start having your say!
	To complete your account setup, just click the URL below or copy and paste it into your browser's address bar</p>`;
	messageString += `<p><a href='${url}'>${url}</a></p>`;

	return messageString;
};

let sendEmail = function (user, pass, req) {
	return transporter.sendMail({
		from: process.env.MAILER_FROM,
		to: user.email,
		subject: 'NewVote UQU Verification',
		html: buildMessage(user, pass, req)
	})
}
