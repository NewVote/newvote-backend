'use strict';

/**
 * Module dependencies.
 */
let acl = require('acl'),
    organizations = require('./organizations/organizations.server.controller');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

let collectionRoutes = [
    '/api/organizations',
    '/api/issues',
    '/api/topics',
    '/api/solutions',
    '/api/votes',
    '/api/comments',
    '/api/proposals',
    '/api/suggestions',
    '/api/endorsement',
    '/api/media',
    '/api/regions',
    '/api/countries'
];
let objectRoutes = [
    '/api/organizations/:organizationId',
    '/api/issues/:issueId',
    '/api/topics/:topicId',
    '/api/solutions/:solutionId',
    '/api/votes/:voteId',
    '/api/comments/:commentId',
    '/api/proposals/:proposalId',
    '/api/suggestions/:suggestionId',
    '/api/endorsement/:endorsementId',
    '/api/media/:mediaId',
    '/api/meta/:uri',
    '/api/regions/:regionId'
];
/**
 * Invoke Articles Permissions
 */
exports.invokeRolesPolicies = function() {
    acl.allow([
        {
            roles: ['admin'],
            allows: [
                {
                    resources: collectionRoutes,
                    permissions: '*'
                },
                {
                    resources: objectRoutes,
                    permissions: '*'
                }
            ]
        },
        {
            roles: ['endorser'],
            allows: [
                {
                    resources: collectionRoutes,
                    permissions: ['get']
                },
                {
                    resources: objectRoutes,
                    permissions: ['get']
                },
                {
                    resources: [
                        '/api/votes',
                        '/api/suggestions',
                        '/api/endorsement'
                    ],
                    permissions: ['get', 'post']
                }
            ]
        },
        {
            roles: ['user'],
            allows: [
                {
                    resources: collectionRoutes,
                    permissions: ['get']
                },
                {
                    resources: objectRoutes,
                    permissions: ['get']
                },
                {
                    // users can create votes
                    resources: ['/api/votes'],
                    permissions: ['get', 'post']
                },
                {
                    // users can create and edit suggestions
                    resources: ['/api/suggestions'],
                    permissions: ['get', 'post', 'put']
                }
            ]
        },
        {
            roles: ['guest'],
            allows: [
                {
                    resources: collectionRoutes,
                    permissions: ['get']
                },
                {
                    resources: objectRoutes,
                    permissions: ['get']
                }
            ]
        }
    ]);
};

/**
 * Check If Articles Policy Allows
 */
exports.isAllowed = function(req, res, next) {
    let roles = req.user ? req.user.roles : ['guest'];
    let user = req.user;

    // If an article is being processed and the current user created it then allow any manipulation
    let object =
        req.vote ||
        req.issue ||
        req.solution ||
        req.proposal ||
        req.organization ||
        req.endorsement ||
        req.topic ||
        req.media ||
        req.suggestion;
    if (object && req.user && object.user && object.user.id === req.user.id) {
        return next();
    }

    // Check for user roles
    acl.areAnyRolesAllowed(
        roles,
        req.route.path,
        req.method.toLowerCase(),
        function(err, isAllowed) {
            if (err) {
                // An authorization error occurred.
                return res.status(500).send('Unexpected authorization error');
            } else {
                // check if role is allowed by default (admin etc)
                if (isAllowed) {
                    // Access granted! Invoke next middleware
                    return next();
                }

                // no user object no use testing for other errors
                if (!user) {
                    // no user object
                    return res.status(401).json({
                        message: 'User is not authenticated'
                    });
                }
                // allowed test failed, is this a non GET request? (POST/UPDATE/DELETE)
                if (req.method.toLowerCase() !== 'get' && user) {
                    debugger;

                    //check for org owner or moderator on all non get requests
                    // this requires a DB query so only use it when necesary
                    canAccessOrganization(req, object).then(result => {
                        if (result) {
                            // they own this organization, let them do whatever
                            return next();
                        } else {
                            // it was not a GET request but they still have no access
                            // check if the issue is that they are not verified
                            if (
                                !user.roles.includes('user') ||
                                !user.verified
                            ) {
                                // user is logged in but they are missing the user role
                                // this means they must not be verified
                                return res.status(403).json({
                                    message: 'User is not authorized',
                                    role: 'user' // used to identify this is a missing role issue
                                });
                            }

                            // not a GET + has 'user' role
                            return res.status(403).json({
                                message: 'User is not authorized'
                            });
                        }
                    });
                } else {
                    // this is a GET request with a user object that was not allowed
                    // generic auth failure
                    return res.status(403).json({
                        message: 'User is not authorized'
                    });
                }
            }
        }
    );
};

// need to find the organization that the user is currently viewing (the url)
// this is NOT the organization that the content belongs to (not the object.organizations)
// N.B new content will have no organization
function canAccessOrganization(req, object) {
    const user = req.user;
    const method = req.method.toLowerCase();
    let organization = null;
    let orgUrl = null;

    try {
        organization = req.organization;
        orgUrl = organization.url;
    } catch (e) {
        Promise.reject('No organization discovered in request body');
    }

    // when creating there is no org for the object yet
    // so use the org in the url to test for ownership
    if (method === 'post') {
        if (
            user.roles.includes('admin') ||
            (organization.owner && organization.owner._id == user._id) ||
            (organization.moderators &&
                organization.moderators.some(mod => mod._id == user._id))
        ) {
            return Promise.resolve(true);
        } else {
            console.error(
                'failed to test user against admin owner or mod list'
            );
            console.error('user is: ', user);
            return Promise.reject(
                'An error occoured while validating your credentials'
            );
        }
    } else if (method === 'put') {
        if (object.collection.name === 'organizations') {
            if (object.owner === null && !user.roles.includes('admin')) {
                console.error('no owner on object and user is not admin');
                Promise.reject(
                    'An error occoured while validating your credentials'
                );
            }
            // we are updating a community so just check its owner (mods cant edit community)
            return Promise.resolve(
                user.roles.includes('admin') || object.owner._id == user._id
            );
        } else {
            // updating other content so need to check organization owner and moderators
            return Promise.resolve(
                (object.organizations.owner &&
                    object.organizations.owner._id == user._id) ||
                    (object.organizations.moderators &&
                        object.organizations.moderators.some(
                            mod => mod == user._id
                        ))
            );
        }
    } else if (method === 'delete') {
        if (req.organization != null) {
            return Promise.resolve(object.owner._id == user._id);
        } else {
            return Promise.resolve(
                (object.organizations.owner &&
                    object.organizations.owner._id == user._id) ||
                    (object.organizations.moderators &&
                        object.organizations.moderators.some(
                            mod => mod == user._id
                        ))
            );
        }
    }
}
