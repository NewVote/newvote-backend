'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	config = require(path.resolve('./config/config')),
	mongoose = require('mongoose'),
	Organization = mongoose.model('Organization'),
	votes = require('../votes/votes.server.controller'),
	Solution = mongoose.model('Solution'),
	User = mongoose.model('User'),
	FutureLeader = mongoose.model('FutureLeader'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash'),
	nodemailer = require('nodemailer'),
	transporter = nodemailer.createTransport(config.mailer.options);

/**
 * Create a organization
 */
exports.create = function (req, res) {

	var organization = new Organization(req.body);
	var userPromise;
	organization.user = req.user;

	let email;
	const { moderators } = req.body;

	if (req.body.owner) {
		email = req.body.owner.email;
	} else {
		email = req.body.newLeaderEmail;
	}

	return findUserAndOrganization(email, moderators)
		.then((promises) => {
			let [user, futureLeader, moderators] = promises;

			if (user) {
				organization.owner = user;
				// can't see anywhere else where this happens, so push org to user orgs
				user.organizations.push(organization.id);
				// if there is a user, need to make sure that future leader does not exist
				// otherwise future leader will be created and email sent
				futureLeader = null;
				user.save();
			}

			if (moderators) {
				organization.moderators = moderators;
			}

			if (futureLeader) {
				organization.futureOwner = futureLeader;
				futureLeader.organizations.push(organization.id);
				futureLeader.save();
			}

			return organization.save();
		})
		.then((savedOrganization) => {
			if (!savedOrganization) throw('Error saving leader');

			if (savedOrganization.futureOwner) {
				sendVerificationCodeViaEmail(req, savedOrganization.futureOwner);
			}
			// After user is saved create and send an email to the user
			return res.json(organization);
		})
		.catch((err) => err);
};

/**
 * Show the current organization
 */
exports.read = function (req, res) {
	res.json(req.organization);
};

/**
 * Update a organization
 */
exports.update = function (req, res) {
	var userPromise;
	var emails = req.body.moderators;
	delete req.body.moderators;
	delete req.body.moderatorsControl;
	// if a user is chosen from existing users then future owner has to be removed
	if (req.body.owner) {
		req.body.futureOwner = null;
	}

	var organization = req.organization;
	_.extend(organization, req.body);

	// turn moderator emails into users before saving
	if(emails && emails.length > 0) {
		userPromise = User.find({ email: emails });
	} else {
		userPromise = Promise.resolve([]);
	}
	userPromise.then(mods => {
		mods = mods.map(m=>m._id);
		organization._doc.moderators.addToSet(mods);
		organization.save(function (err) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				res.status(200).json(organization);
			}
		});
	})
};

/**
 * Delete an organization
 */
exports.delete = function (req, res) {
	var organization = req.organization;

	organization.remove(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(organization);
		}
	});
};

/**
 * List of Organizations
 */
exports.list = function (req, res) {
	let query = req.query.url ? { url: req.query.url } : {};
	let showDeleted = req.query.showDeleted || null;

	let showNonDeletedItemsMatch = { $or: [{ 'softDeleted': false }, { 'softDeleted': { $exists: false } }] };
	let showAllItemsMatch = {};
	let softDeleteMatch = showDeleted ? showAllItemsMatch : showNonDeletedItemsMatch;


	Organization.aggregate([
		{ $match: query },
		{ $match: softDeleteMatch },
		{ $sort: { 'name': 1 } }
	])
		.exec(function (err, organizations) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			}

			return res.json(organizations);
		});
};

/**
 * Organization middleware
 */
exports.organizationByID = function (req, res, next, id) {
	if(!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400)
			.send({
				message: 'Organization is invalid'
			});
	}

	Organization.findById(id)
		.populate('user', 'displayName')
		.populate('owner', '_id displayName firstName lastName email')
		.populate('moderators', '_id displayName firstName lastName email')
		.populate('futureOwner', '_id email')
		.exec(function (err, organization) {
			if(err) return next(err);
			if(!organization) {
				return res.status(404)
					.send({
						message: 'No organization with that identifier has been found'
					});
			}
			req.organization = organization;
			next();
		});
};

exports.organizationByUrl = function (url) {

	if(!url) {
		return null;
	}

	let query = { url };

	return Organization.findOne(query)
		.populate('user', 'displayName')
		.populate('owner', '_id displayName firstName lastName email')
		.populate('moderators', '_id email')
		.exec();
}

exports.getOrganization = function (req, res) {
	const { url } = req.query;
	return Organization.findOne({url})
		.then((org) => {
			if (!org) throw('Organization does not exist');
			if (!req.organization) req.organization = org;

			return res.json(org);
		})
		.catch((err) => res.status(400).send({ message: errorHandler.getErrorMessage(err) }));
}


function findUserAndOrganization (email, moderators) {

	const findUserPromise = User.findOne({ email })
		.then((user) => {
			if (!user) return false;
			return user;
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

	const findModerators = User.find({ email: moderators });

	return Promise.all([findUserPromise, doesNewLeaderExist, findModerators])
}

var buildMessage = function (code, req) {
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
		html: buildMessage(pass, req)
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

function sendVerificationCodeViaEmail (req, user) {
	var pass$ = FutureLeader.generateRandomPassphrase()

	if (user.emailDelivered) return true;

	//send code via email
	return pass$.then(pass => saveEmailVerificationCode(user, pass))
		.then(pass => sendEmail(user, pass, req))
		.then((data) => {
			console.log('Succesfully sent a verification e-mail: ', data);

			user.emailDelivered = true;
			user.save();

			return true;
		})
		.catch((err) => {
			console.log('error sending verification email: ', err);
			throw('There was a problem while sending your verification e-mail, please try again later.')
		});
};
