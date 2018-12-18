'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Solution = mongoose.model('Solution'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	votes = require('../votes/votes.server.controller'),
	proposals = require('../proposals/proposals.server.controller'),
	_ = require('lodash');

/**
 * Create a solution
 */
exports.create = function (req, res) {
	var solution = new Solution(req.body);
	solution.user = req.user;
	solution.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(solution);
		}
	});
};

/**
 * Show the current solution
 */
exports.read = function (req, res) {
	res.json(req.solution);
};

/**
 * Update a solution
 */
exports.update = function (req, res) {
	var solution = req.solution;
	_.extend(solution, req.body);
	// solution.title = req.body.title;
	// solution.content = req.body.content;

	solution.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(solution);
		}
	});
};

/**
 * Delete an solution
 */
exports.delete = function (req, res) {
	var solution = req.solution;

	solution.remove(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(solution);
		}
	});
};

/**
 * List of Solutions
 */
exports.list = function (req, res) {
	let query = {};
	let issueId = req.query.issueId || null;
	let search = req.query.search || null;
	let org = req.query.organization || null;

	let orgMatch = org ? { 'organizations.url': org } : {};
	let issueMatch = issueId ? { 'issues': mongoose.Types.ObjectId(issueId) } : {};

	Solution.aggregate([
			{ $match: issueMatch },
			{
				$lookup: {
					'from': 'organizations',
					'localField': 'organizations',
					'foreignField': '_id',
					'as': 'organizations'
				}
			},
			{ $match: orgMatch },
			{
				$lookup: {
					'from': 'issues',
					'localField': 'issues',
					'foreignField': '_id',
					'as': 'topics'
				}
			},
			{ $sort: { 'created': -1 } }
	])
		.exec(function (err, solutions) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				votes.attachVotes(solutions, req.user, req.query.regions)
					.then(function (solutions) {
						proposals.attachProposals(solutions, req.user, req.query.regions)
							.then(solutions => {
								// debugger;
								res.json(solutions);
							})
					})
					.catch(function (err) {
						// console.log(err);
						res.status(500)
							.send({
								message: errorHandler.getErrorMessage(err)
							});
					});
			}
		});
};

/**
 * Solution middleware
 */
exports.solutionByID = function (req, res, next, id) {

	if(!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400)
			.send({
				message: 'Solution is invalid'
			});
	}

	Solution.findById(id)
		.populate('user', 'displayName')
		.populate('issues')
		.exec(function (err, solution) {
			if(err) {
				return next(err);
			} else if(!solution) {
				return res.status(404)
					.send({
						message: 'No solution with that identifier has been found'
					});
			}
			votes.attachVotes([solution], req.user, req.query.regions)
				.then(function (solutionArr) {
					proposals.attachProposals(solutionArr, req.user, req.query.regions)
						.then(solutions => {
							// debugger;
							req.solution = solutions[0];
							next();
						})
				})
				.catch(next);
		});
};
