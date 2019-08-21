'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	config = require(path.resolve('./config/config')),
	Suggestion = mongoose.model('Suggestion'),
	Organization = mongoose.model('Organization'),
	Issue = mongoose.model('Issue'),
	Solution = mongoose.model('Solution'),
	Proposal = mongoose.model('Proposal'),
	votes = require('../votes/votes.server.controller'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	nodemailer = require('nodemailer'),
	transporter = nodemailer.createTransport(config.mailer.options),
	_ = require('lodash');

// TODO: Use a server side templating language to use a html file for this
var buildMessage = function (suggestion, req) {
	var messageString = '';
	var url = req.protocol + '://' + req.get('host');
	if(!suggestion.parent) {
		messageString += '<h2> This is a new suggestion' + '</h2>';
		messageString += '<h3>Title: ' + suggestion.title + '</h3>';
	} else {
		messageString += '<h2> This is an edit for:' + '</h2>';
		messageString += `<h3>Title: <a href='${url}/${suggestion.parentType.toLowerCase()}s/${suggestion.parent._id}'>` + suggestion.title + '</a></h3>';
	}

	messageString += '<p>User: ' + suggestion.user.firstName + ' ' + suggestion.user.lastName + '(' + suggestion.user.email + ')</p>';
	messageString += '<h3>Summary: </h3>';
	messageString += '<p>' + suggestion.description + '</p>';
	messageString += '<h3>Starting Statements: </h3>';
	messageString += '<p>' + suggestion.statements + '</p>';
	messageString += '<h3>3rd Party Media: </h3>';
	messageString += '<p>' + suggestion.media + '</p>';

	return messageString;
};

/**
 * Create a suggestion
 */
exports.create = function (req, res) {
	var suggestion = new Suggestion(req.body);

	if (!suggestion.parent) {
		suggestion.parent = null;
	}
	// console.log(err, 'this is err');
	// console.log(info, 'this is info');ion(req.body);
	suggestion.user = req.user;
	suggestion.save((err) => {
		if (err) throw(err);
	});

	const getSuggestion = Suggestion
		.populate(suggestion, { path: 'user organizations' })

	const getOrganization = getSuggestion.then((suggestion) => {
		// if organization has no owner then begin exit out of promise chain
		if (!suggestion.organizations || !suggestion.organizations.owner) return false;
		return Organization
				.populate(suggestion.organizations, { path: 'owner' })
	})

	return Promise.all([getSuggestion, getOrganization])
		.then((promises) => {
			const [suggestionPromise, orgPromise] = promises;
			if (!orgPromise || !suggestionPromise) return false;

			return transporter.sendMail({
				from: process.env.MAILER_FROM,
				to: orgPromise.owner.email,
				subject: 'New suggestion created on your NewVote community!',
				html: buildMessage(suggestion, req)
			}, (err, info) => {
				return false;
			})
		})
		.then(function () {
			// console.log('mailer success: ', data);
			return res.status(200).json(suggestion);
		})
		.catch((err) => {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		});
};

/**
 * Show the current suggestion
 */
exports.read = function (req, res) {
	votes.attachVotes([req.suggestion], req.user, req.query.regions)
		.then(function (suggestionArr) {
			const updatedSuggestion = suggestionArr[0];
			res.json(updatedSuggestion);
		})
		.catch(err => {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		});
};

/**
 * Update a suggestion
 */
exports.update = function (req, res) {
	var suggestion = req.suggestion;
	_.extend(suggestion, req.body);
	// suggestion.title = req.body.title;
	// suggestion.content = req.body.content;

	suggestion.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(suggestion);
		}
	});
};

/**
 * Delete an suggestion
 */
exports.delete = function (req, res) {
	var suggestion = req.suggestion;

	suggestion.remove(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(suggestion);
		}
	});
};

/**
 * List of Suggestions
 */
exports.list = function (req, res) {
	let search = req.query.search || null;
	let org = req.organization
	let orgUrl = org ? org.url : null;
	let showDeleted = req.query.showDeleted || null;
	let type = req.query.type || null;

	let orgMatch = orgUrl ? { 'organizations.url': orgUrl } : {};
	let searchMatch = search ? { $text: { $search: search } } : {};
	let typeMatch = type ? { type: type } : {};

	let showNonDeletedItemsMatch = { $or: [{ 'softDeleted': false }, { 'softDeleted': { $exists: false } }] };
	let showAllItemsMatch = {};
	let softDeleteMatch = showDeleted ? showAllItemsMatch : showNonDeletedItemsMatch;

	Suggestion.aggregate([

		{ $match: searchMatch },
		{ $match: softDeleteMatch },
		{ $match: typeMatch },
		{
			$lookup: {
				'from': 'organizations',
				'localField': 'organizations',
				'foreignField': '_id',
				'as': 'organizations'

			}
		},
		{ $match: orgMatch },
		{ $unwind: '$organizations' },
		{ $sort: { 'created': -1 } }
	])
	.exec(function (err, suggestions) {
		if(err) throw(err);

		votes.attachVotes(suggestions, req.user, req.query.regions)
			.then((suggestions) => res.json(suggestions))
			.catch((err) => {throw(err)});
	})
};

/**
 * Suggestion middleware
 */
exports.suggestionByID = function (req, res, next, id) {
	if(!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400)
			.send({
				message: 'Suggestion is invalid'
			});
	}

	Suggestion.findById(id)
		.populate('user', 'displayName')
		.populate('organizations')
		.exec(function (err, suggestion) {
			if(err) {
				return next(err);
			} else if(!suggestion) {
				return res.status(404)
					.send({
						message: 'No suggestion with that identifier has been found'
					});
			}
			req.suggestion = suggestion;
			next();
		});
};
