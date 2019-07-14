'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	config = require(path.resolve('./config/config')),
	mongoose = require('mongoose'),
	Organization = mongoose.model('Organization'),
	User = mongoose.model('User'),
	FutureLeader = mongoose.model('FutureLeader'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash'),
	nodemailer = require('nodemailer'),
	transporter = nodemailer.createTransport(config.mailer.options);


exports.update = function (req, res) {

	const { organizationId } = req.params
	const { newLeaderEmail: email } = req.body;

	if (!organizationId || !email) {

		return res.status(400)
			.send({
				message: 'Email / ID does not exist on query'
			})
	}

	const findUserPromise = User.findOne({ email })
		.then((user) => {
			if (user) throw('User exists on database');			
			return false;
		})

	const doesNewLeaderExist = FutureLeader.findOne({ email })
		.then((leader) => {
			// if leader exists then future leader is on the database
				// if leader does exist we want to return leader
				if (leader) {
					return leader;
				}

				// if leader does not exist create a new leader
				const owner = new FutureLeader({ email });
				return owner;				
		})


	const doesOrganizationExistOnFutureLeader = FutureLeader.findOne({ organizations: organizationId })
		.then((currentFutureLeader) => {
			if (!currentFutureLeader) return false;
				
			if (currentFutureLeader.email === email) {
				throw('User is already set to become owner.')
			}

			currentFutureLeader.organizations.pull(organizationId);
			return currentFutureLeader.save();		
		})

	const findOrganizationPromise = Organization.findById(organizationId);

	return Promise.all([findUserPromise, doesNewLeaderExist, doesOrganizationExistOnFutureLeader, findOrganizationPromise])
		.then(promises => {
			let [user, leader, currentFutureLeader, organization] = promises;
			
			if (!organization) throw('No organization')
			if (!leader) throw('No leader');

			organization.owner = null;
			organization.futureOwner = leader._id;

			organization.save();

			leader.organizations.push(organization._id);
			return leader.save()	
		})
		.then((savedLeader) => {
			// After user is saved create and send an email to the user
			return sendVerificationCodeViaEmail(req, res, savedLeader);
		})
		.catch((err) => {
			console.log(err, 'this is err');
			return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
		})
};

var buildMessage = function (user, code, req) {
	var messageString = '';
	var url = req.protocol + '://' + req.get('host') + '/auth/signup/' + code;

	messageString += `<h3> You have been invited to join NewVote </h3>`;
	messageString += `<p>To complete your account setup, just click the URL below or copy and paste it into your browser's address bar</p>`;
	messageString += `<p><a href='${url}'>${url}</a></p>`;

	return messageString;
};

var sendEmail = function (user, pass, req) {
	return transporter.sendMail({
		from: process.env.MAILER_FROM,
		to: user.email,
		subject: 'NewVote UQU Verification',
		html: buildMessage(user, pass, req)
	})
}

function saveEmailVerificationCode(user, code) {

	return FutureLeader.findById(user._id)
		.then((user) => {
			if(!user) {
				throw Error('We could not find the user in the database. Please contact administration.');
			}

			// Future leader may exist so no need to recreate code
			if (user.verificationCode) return user;

			//add hashed code to users model
			user.verificationCode = user.hashVerificationCode(code);

			//update user model
			return user.save();			
        })
		.then(() => code)
}

function sendVerificationCodeViaEmail (req, res, user) {
	var pass$ = FutureLeader.generateRandomPassphrase()

	if (user.emailDelivered) return res.status(200).send({ message: 'Leader Successfully Added' });

	//send code via email
	return pass$.then(pass => saveEmailVerificationCode(user, pass))
		.then(pass => sendEmail(user, pass, req))
		.then((data) => {
			console.log('Succesfully sent a verification e-mail: ', data);

			user.emailDelivered = true; 
			user.save();

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





