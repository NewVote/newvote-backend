'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Organization = mongoose.model('Organization'),
	votes = require('../votes/votes.server.controller'),
	Solution = mongoose.model('Solution'),
	User = mongoose.model('User'),
	FutureLeader = mongoose.model('FutureLeader'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash');

/**
 * Create a organization
 */
exports.create = function (req, res) {
	var organization = new Organization(req.body);
	var userPromise;
	organization.user = req.user;

	// turn moderator emails into users before saving
	if(req.body.moderators && req.body.moderators.length > 0) {
		userPromise = User.find({ email: req.body.moderators });
	} else {
		userPromise = Promise.resolve([]);
	}

	userPromise.then((mods) => {
		organization.moderators = mods;
		organization.save(function (err) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				res.json(organization);
			}
		});
	})
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
				res.json(organization);
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

	Organization.find(query)
		.sort('-created')
		.exec(function (err, organizations) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				res.json(organizations);
			}
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
		.exec(function (err, organization) {
			if(err) {
				return next(err);
			} else if(!organization) {
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
