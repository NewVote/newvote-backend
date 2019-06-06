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
	debugger;
	var suggestion = new Suggestion(req.body);
	suggestion.user = req.user;
	suggestion.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			Suggestion.populate(suggestion, { path: 'user parent organizations' })
				.then((suggestion) => {
					Organization.populate(suggestion.organizations, { path: 'owner' })
						.then((org) => {
							transporter.sendMail({
									from: process.env.MAILER_FROM,
									to: org.owner.email,
									subject: 'New suggestion created on your NewVote community!',
									html: buildMessage(suggestion, req)
								})
								.then(function (data) {
									// console.log('mailer success: ', data);
								}, function (err) {
									console.log('mailer failed: ', err);
								});
						})
				});
			res.json(suggestion);
		}
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
	let org = req.query.organization || null;
	let showDeleted = req.query.showDeleted || null;

	let orgMatch = org ? { 'organizations.url': org } : {};
	let searchMatch = search ? { $text: { $search: search } } : {};

	let showNonDeletedItemsMatch = { $or: [{ 'softDeleted': false }, { 'softDeleted': { $exists: false } }] };
	let showAllItemsMatch = {};
	let softDeleteMatch = showDeleted ? showAllItemsMatch : showNonDeletedItemsMatch;

	Suggestion.aggregate([
			{ $match: softDeleteMatch },
			{ $match: searchMatch },
			{
				$lookup: {
					'from': 'organizations',
					'localField': 'organizations',
					'foreignField': '_id',
					'as': 'organizations'
				}
			},
			{ $match: orgMatch },
			{ $sort: { 'created': -1 } }
	])
		.exec(function (err, suggestions) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				votes.attachVotes(suggestions, req.user, req.query.regions)
					.then(function (suggestions) {
						res.json(suggestions);
					})
					.catch(function (err) {
						res.status(500)
							.send({
								message: errorHandler.getErrorMessage(err)
							});
					});
			}
		});
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
		.populate('parent')
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
