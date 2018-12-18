'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	config = require(path.resolve('./config/config')),
	policy = require('./generic.server.policy'),
	topics = require('./topics/topics.server.controller'),
	organizations = require('./organizations/organizations.server.controller'),
	issues = require('./issues/issues.server.controller'),
	solutions = require('./solutions/solutions.server.controller'),
	proposals = require('./proposals/proposals.server.controller'),
	suggestions = require('./suggestions/suggestions.server.controller'),
	media = require('./media/media.server.controller'),
	endorsement = require('./endorsement/endorsement.server.controller'),
	votes = require('./votes/votes.server.controller'),
	regions = require('./regions/regions.server.controller'),
	countries = require('./countries/countries.server.controller'),
	passport = require('passport'),
	jwt = require('express-jwt');

// jwt module simply puts the user object into req.user if the token is valid
// otherwise it just does nothing and the policy module handles the rest

module.exports = function (app) {
	// Articles collection routes
	app.route('/api/organizations')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(organizations.list)
		.post(organizations.create);

	app.route('/api/topics')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(topics.list)
		.post(topics.create);

	app.route('/api/issues')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(issues.list)
		.post(issues.create);

	app.route('/api/solutions')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(solutions.list)
		.post(solutions.create);

	app.route('/api/votes')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(votes.list)
		.post(votes.updateOrCreate);

	app.route('/api/proposals')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(proposals.list)
		.post(proposals.create);

	app.route('/api/suggestions')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(suggestions.list)
		.post(suggestions.create);

	app.route('/api/endorsement')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(endorsement.list)
		.post(endorsement.create);

	app.route('/api/media')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(media.list)
		.post(media.create);

	app.route('/api/regions')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(regions.list)
		.post(regions.create);

	app.route('/api/countries')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(countries.list);

	app.route('/api/meta/:uri')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(media.getMeta);

	// Single article routes
	app.route('/api/topics/:topicId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(topics.read)
		.put(topics.update)
		.delete(topics.delete);

	app.route('/api/organizations/:organizationId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(organizations.read)
		.put(organizations.update)
		.delete(organizations.delete);

	app.route('/api/issues/:issueId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(issues.read)
		.put(issues.update)
		.delete(issues.delete);

	app.route('/api/solutions/:solutionId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(solutions.read)
		.put(solutions.update)
		.delete(solutions.delete);

	app.route('/api/votes/:voteId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(votes.read)
		.put(votes.update)
		.delete(votes.delete);

	app.route('/api/proposals/:proposalId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(proposals.read)
		.put(proposals.update)
		.delete(proposals.delete);

	app.route('/api/suggestions/:suggestionId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(suggestions.read)
		.delete(suggestions.delete);

	app.route('/api/endorsement/:endorsementId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(endorsement.read)
		.put(endorsement.update)
		.delete(endorsement.delete);

	app.route('/api/media/:mediaId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(media.read)
		.put(media.update)
		.delete(media.delete);

	app.route('/api/regions/:regionId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(regions.read)
		.put(regions.update)
		.delete(regions.delete);

	app.route('/api/countries/:countryId')
		.all(jwt({ secret: config.jwtSecret, credentialsRequired: false }), policy.isAllowed)
		.get(countries.read);

	// Finish by binding the article middleware
	app.param('topicId', topics.topicByID);
	app.param('organizationId', organizations.organizationByID);
	app.param('issueId', issues.issueByID);
	app.param('solutionId', solutions.solutionByID);
	app.param('proposalId', proposals.proposalByID);
	app.param('voteId', votes.voteByID);
	app.param('suggestionId', suggestions.suggestionByID);
	app.param('endorsementId', endorsement.endorsementByID);
	app.param('mediaId', media.mediaByID);
	app.param('regionId', regions.regionByID);
	app.param('countryId', countries.countryByID);
};
