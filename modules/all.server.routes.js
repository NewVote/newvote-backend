'use strict';

/**
 * Module dependencies.
 */
var policy = require('./generic.server.policy'),
	topics = require('./topics/topics.server.controller'),
	issues = require('./issues/issues.server.controller'),
	solutions = require('./solutions/solutions.server.controller'),
	proposals = require('./proposals/proposals.server.controller'),
	suggestions = require('./suggestions/suggestions.server.controller'),
	media = require('./media/media.server.controller'),
	endorsement = require('./endorsement/endorsement.server.controller'),
	votes = require('./votes/votes.server.controller'),
	regions = require('./regions/regions.server.controller'),
	countries = require('./countries/countries.server.controller');

module.exports = function (app) {
	// Articles collection routes
	app.route('/api/topics')
		.all(policy.isAllowed)
		.get(topics.list)
		.post(topics.create);

	app.route('/api/issues')
		.all(policy.isAllowed)
		.get(issues.list)
		.post(issues.create);

	app.route('/api/solutions')
		.all(policy.isAllowed)
		.get(solutions.list)
		.post(solutions.create);

	app.route('/api/votes')
		.all(policy.isAllowed)
		.get(votes.list)
		.post(votes.updateOrCreate);

	app.route('/api/proposals')
		.all(policy.isAllowed)
		.get(proposals.list)
		.post(proposals.create);

	app.route('/api/suggestions')
		.all(policy.isAllowed)
		.get(suggestions.list)
		.post(suggestions.create);

	app.route('/api/endorsement')
		.all(policy.isAllowed)
		.get(endorsement.list)
		.post(endorsement.create);

	app.route('/api/media')
		.all(policy.isAllowed)
		.get(media.list)
		.post(media.create);

	app.route('/api/regions')
		.all(policy.isAllowed)
		.get(regions.list)
		.post(regions.create);

	app.route('/api/countries')
		.all(policy.isAllowed)
		.get(countries.list);

	app.route('/api/meta/:uri')
		.all(policy.isAllowed)
		.get(media.getMeta);

	// Single article routes
	app.route('/api/topics/:topicId')
		.all(policy.isAllowed)
		.get(topics.read)
		.put(topics.update)
		.delete(topics.delete);

	app.route('/api/issues/:issueId')
		.all(policy.isAllowed)
		.get(issues.read)
		.put(issues.update)
		.delete(issues.delete);

	app.route('/api/solutions/:solutionId')
		.all(policy.isAllowed)
		.get(solutions.read)
		.put(solutions.update)
		.delete(solutions.delete);

	app.route('/api/votes/:voteId')
		.all(policy.isAllowed)
		.get(votes.read)
		.put(votes.update)
		.delete(votes.delete);

	app.route('/api/proposals/:proposalId')
		.all(policy.isAllowed)
		.get(proposals.read)
		.put(proposals.update)
		.delete(proposals.delete);

	app.route('/api/suggestions/:suggestionId')
		.all(policy.isAllowed)
		.get(suggestions.read)
		.delete(suggestions.delete);

	app.route('/api/endorsement/:endorsementId')
		.all(policy.isAllowed)
		.get(endorsement.read)
		.put(endorsement.update)
		.delete(endorsement.delete);

	app.route('/api/media/:mediaId')
		.all(policy.isAllowed)
		.get(media.read)
		.put(media.update)
		.delete(media.delete);

	app.route('/api/regions/:regionId')
		.all(policy.isAllowed)
		.get(regions.read)
		.put(regions.update)
		.delete(regions.delete);

	app.route('/api/countries/:countryId')
		.all(policy.isAllowed)
		.get(countries.read);

	// Finish by binding the article middleware
	app.param('topicId', topics.topicByID);
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
