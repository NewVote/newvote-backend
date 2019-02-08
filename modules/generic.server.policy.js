'use strict';

/**
 * Module dependencies.
 */
var acl = require('acl'),
	organizations = require('./organizations/organizations.server.controller');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

var collectionRoutes = ['/api/organizations', '/api/issues', '/api/topics', '/api/solutions', '/api/votes', '/api/comments', '/api/proposals', '/api/suggestions', '/api/endorsement', '/api/media', '/api/regions', '/api/countries'];
var objectRoutes = ['/api/organizations/:organizationId', '/api/issues/:issueId', '/api/topics/:topicId', '/api/solutions/:solutionId', '/api/votes/:voteId', '/api/comments/:commentId', '/api/proposals/:proposalId', '/api/suggestions/:suggestionId', '/api/endorsement/:endorsementId', '/api/media/:mediaId', '/api/meta/:uri', '/api/regions/:regionId'];
/**
 * Invoke Articles Permissions
 */
exports.invokeRolesPolicies = function () {
	acl.allow([{
		roles: ['admin'],
		allows: [{
			resources: collectionRoutes,
			permissions: '*'
    }, {
			resources: objectRoutes,
			permissions: '*'
    }]
  }, {
		roles: ['endorser'],
		allows: [{
			resources: collectionRoutes,
			permissions: ['get']
    }, {
			resources: objectRoutes,
			permissions: ['get']
  }, {
			resources: ['/api/votes', '/api/suggestions', '/api/endorsement'],
			permissions: ['get', 'post']
  }]
  }, {
		roles: ['user'],
		allows: [{
			resources: collectionRoutes,
			permissions: ['get']
    }, {
			resources: objectRoutes,
			permissions: ['get']
  }, {
			resources: ['/api/votes', '/api/suggestions'],
			permissions: ['get', 'post']
  }]
  }, {
		roles: ['guest'],
		allows: [{
			resources: collectionRoutes,
			permissions: ['get']
    }, {
			resources: objectRoutes,
			permissions: ['get']
    }]
  }]);
};

/**
 * Check If Articles Policy Allows
 */
exports.isAllowed = function (req, res, next) {
	var roles = (req.user) ? req.user.roles : ['guest'];
	var user = req.user;

	// debugger;

	// If an article is being processed and the current user created it then allow any manipulation
	var object = req.article || req.vote || req.issue || req.solution || req.proposal || req.organization || req.endorsement || req.topic || req.media;
	if(object && req.user && object.user && object.user.id === req.user.id) {
		return next();
	}

	// Check for user roles
	acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
		if(err) {
			// An authorization error occurred.
			return res.status(500)
				.send('Unexpected authorization error');
		} else {
			// check if role is allowed by default (admin etc)
			if(isAllowed) {
				// Access granted! Invoke next middleware
				return next();
			} else if(req.method.toLowerCase() !== 'get' && user) {
				//check for org owner on all non get requests
				// this requires a DB query so only use it when necesary
				isOrganizationOwner(req, object)
					.then(result => {
						if(result) return next();
					})
			} else if(!req.user) {
				return res.status(401)
					.json({
						message: 'User is not authenticated'
					});
			} else {
				return res.status(403)
					.json({
						message: 'User is not authorized'
					});
			}
		}
	});

};

// need to find the organization that the user is currently viewing (the url)
// this is NOT the organization that the content belongs to (not the object.organizations)
// N.B new content will have no organization
function isOrganizationOwner(req, object) {
	// debugger;
	const orgUrl = req.query.organization;
	const user = req.user;
	const method = req.method.toLowerCase();

	// when creating there is no org for the object yet
	// so use the org in the url to test for ownership
	if(method === 'post') {
		return organizations.organizationByUrl(orgUrl)
			.then(org => {
				if(org.owner._id == user._id) {
					return true;
				} else {
					return false;
				}
			});
	} else if(method === 'put' || method === 'delete') {
		if(req.organization) {
			return Promise.resolve(object.owner._id == user._id);
		} else {
			return Promise.resolve(object.organizations.owner._id == user._id);
		}
	}

}
