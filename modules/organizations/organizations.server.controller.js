'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Organization = mongoose.model('Organization'),
	OrganizationsController = require('./organizations.server.controller'),
	votes = require('../votes/votes.server.controller'),
	Solution = mongoose.model('Solution'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash');

/**
 * Create a organization
 */
exports.create = function (req, res) {
	var organization = new Organization(req.body);
	organization.user = req.user;
	organization.save(function (err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(organization);
		}
	});
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
	var organization = req.organization;
	_.extend(organization, req.body);

	organization.save(function (err) {
		if (err) {
			return res.status(400).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			res.json(organization);
		}
	});
};

/**
 * Delete an organization
 */
exports.delete = function (req, res) {
	var organization = req.organization;

	organization.remove(function (err) {
		if (err) {
			return res.status(400).send({
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

	Organization.find(query).sort('-created').exec(function (err, organizations) {
		if (err) {
			return res.status(400).send({
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

	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).send({
			message: 'Organization is invalid'
		});
	}

	Organization.findById(id).populate('user', 'displayName').exec(function (err, organization) {
		if (err) {
			return next(err);
		} else if (!organization) {
			return res.status(404).send({
				message: 'No organization with that identifier has been found'
			});
		}
		req.organization = organization;
		next();
	});
};
