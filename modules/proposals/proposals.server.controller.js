'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Proposal = mongoose.model('Proposal'),
	votes = require('../votes/votes.server.controller'),
	Solution = mongoose.model('Solution'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash');

/**
 * Create a proposal
 */
exports.create = function (req, res) {
	var proposal = new Proposal(req.body);
	proposal.user = req.user;
	proposal.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(proposal);
		}
	});
};

/**
 * Show the current proposal
 */
exports.read = function (req, res) {
	votes.attachVotes([req.proposal], req.user, req.query.regions)
		.then(function (proposalArr) {
			const updatedProposal = proposalArr[0];
			res.json(updatedProposal);
		})
		.catch(err => {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		});
};

/**
 * Update a proposal
 */
exports.update = function (req, res) {
	delete req.body.__v;
	var proposal = req.proposal;
	_.extend(proposal, req.body);
	// proposal.title = req.body.title;
	// proposal.content = req.body.content;
	proposal.user = req.user;
	proposal.save(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(proposal);
		}
	});
};

/**
 * Delete an proposal
 */
exports.delete = function (req, res) {
	var proposal = req.proposal;

	proposal.remove(function (err) {
		if(err) {
			return res.status(400)
				.send({
					message: errorHandler.getErrorMessage(err)
				});
		} else {
			res.json(proposal);
		}
	});
};

/**
 * List of Proposals
 */
exports.list = function (req, res) {
	let solutionId = req.query.solutionId || null;
	let search = req.query.search || null;
	let org = req.query.organization || null;

	let orgMatch = org ? { 'organizations.url': org } : {};
	let solutionMatch = solutionId ? { 'solutions': mongoose.Types.ObjectId(solutionId) } : {};
	let searchMatch = search ? { $text: { $search: search } } : {};

	Proposal.aggregate([
			{ $match: searchMatch },
			{ $match: solutionMatch },
			{
				$lookup: {
					'from': 'organizations',
					'localField': 'organizations',
					'foreignField': '_id',
					'as': 'organizations'
				}
			},
			{
				$lookup: {
					'from': 'solutions',
					'localField': 'solutions',
					'foreignField': '_id',
					'as': 'solutions'
				}
			},
			{ $match: orgMatch },
			{ $unwind: '$organizations' },
			{ $sort: { 'created': -1 } }
	])
		.exec(function (err, proposals) {
			if(err) {
				return res.status(400)
					.send({
						message: errorHandler.getErrorMessage(err)
					});
			} else {
				votes.attachVotes(proposals, req.user, req.query.regions)
					.then(function (proposals) {
						res.json(proposals);
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
 * Proposal middleware
 */
exports.proposalByID = function (req, res, next, id) {

	if(!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400)
			.send({
				message: 'Proposal is invalid'
			});
	}

	Proposal.findById(id)
		.populate('user', 'displayName')
		.populate('solutions')
		.populate('solution')
		.populate('organizations')
		.exec(function (err, proposal) {
			if(err) {
				return next(err);
			} else if(!proposal) {
				return res.status(404)
					.send({
						message: 'No proposal with that identifier has been found'
					});
			}
			req.proposal = proposal;
			next();
		});
};

exports.attachProposals = function (objects, user, regions) {
	// debugger;
	const promises = objects.map((obj => {
		return Proposal.find({ solutions: obj._id })
			.populate('solutions')
			.then(props => {
				return votes.attachVotes(props, user, regions)
					.then(props => {
						obj.proposals = props;
						return obj;
					})
			})
	}))
	return Promise.all(promises);
}

function updateSchema(proposals) {
	console.log('schema update called');
	for(var i = 0; i < proposals.length; i++) {
		var proposal = proposals[i];
		console.log('testing: ', proposal.title);
		if(proposal.goals && proposal.goals.length > 0) {
			proposal.solutions = proposal.goals;
			// proposal.goal = undefined;
			proposal.goals = undefined;
			delete proposal.goals;

			console.log('updated: ', proposal.title);
			proposal.save()
				.then(() => console.log('saved proposal'));
		}
	}
}
