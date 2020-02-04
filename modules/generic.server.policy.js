'use strict';

/**
 * Module dependencies.
 */
let acl = require('acl'),
    mongoose = require('mongoose'),
    organizationController = require('./organizations/organizations.server.controller'),
    Organization = mongoose.model('Organization'),
    Rep = mongoose.model('Rep');

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
    '/api/countries',
    '/api/reps'
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
    '/api/regions/:regionId',
    '/api/reps/:repId'
];
/**
 * Invoke Articles Permissions
 */
exports.invokeRolesPolicies = function () {
    acl.allow([{
        roles: ['admin'],
        allows: [{
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
        roles: ['rep'],
        allows: [{
            resources: collectionRoutes,
            permissions: ['get']
        },
        {
            resources: objectRoutes,
            permissions: ['get']
        },
        {
            resources: [
                '/api/issues',
                '/api/solutions',
                '/api/proposals'
            ],
            permissions: ['get', 'post']
        },
        {
            resources: [
                '/api/reps/:repId'
            ],
            permissions: ['get', 'put']
        }
        ]
    },
    {
        roles: ['endorser'],
        allows: [{
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
        },
        {
            // users can create and edit suggestions
            resources: ['/api/suggestions', '/api/suggestions/:suggestionId'],
            permissions: ['get', 'post', 'put']
        }
        ]
    },
    {
        roles: ['user'],
        allows: [{
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
            resources: ['/api/suggestions', '/api/suggestions/:suggestionId'],
            permissions: ['get', 'post', 'put']
        }
        ]
    },
    {
        roles: ['guest'],
        allows: [{
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
exports.isAllowed = async function (req, res, next) {
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
        req.suggestion ||
        req.rep
    if (object && req.user && object.user && object.user.id === req.user.id) {
        return next();
    }

    // Check for user roles
    acl.areAnyRolesAllowed(
        roles,
        req.route.path,
        req.method.toLowerCase(),
        function (err, isAllowed) {
            // An authorization error occurred.
            if (err) return res.status(500).send('Unexpected authorization error');

            // check if role is allowed by default (admin etc)
            // Access granted! Invoke next middleware
            if (isAllowed) return next();

            // no user object no use testing for other errors
            if (!user) return res.status(401).json({
                message: 'User is not authenticated'
            });

            if (
                !user.roles.includes('user') ||
                !user.verified
            ) {
                // user is logged in but they are missing the user role
                // this means they must not be verified
                return res.status(403).json({
                    message: 'User is not authorized',
                    role: 'user' // used to identify on client this is a missing role issue
                });
            }

            // allowed test failed, is this a non GET request? (POST/UPDATE/DELETE)
            if (req.method.toLowerCase() !== 'get' && user) {
                //check for org owner or moderator on all non get requests
                // this requires a DB query so only use it when necesary
                return canAccessOrganization(req, object)
                    .then(result => {
                        // they own this organization, let them do whatever
                        return next();
                    })
                    .catch((err) => {
                        return res.status(403).json({
                            message: err
                        });
                    });
            }

            // this is a GET request with a user object that was not allowed
            // generic auth failure
            return res.status(403).json({
                message: 'User is not authorized'
            });
        }
    );
};

// need to find the organization that the user is currently viewing (the url)
// this is NOT the organization that the content belongs to (not the object.organizations)
// N.B new content will have no organization
async function canAccessOrganization(req, object) {
    // Check the session url against the request url (via referrer)
    // If not matching reject
    if (!checkUrl(req)) throw('Session domain does not match request');

    const { organization: reqOrg } = req;
    if (!reqOrg) throw('No organization discovered in request body')

    const method = req.method.toLowerCase();
    const { owner, moderators } = await Organization
        .findOne({ _id: reqOrg._id })
        .populate('owner')

    const { roles, _id: id } = req.user;
    const { collection } = object;

    const rep = await Rep 
        .findOne({ _id: id, organizations: reqOrg._id })

    // check user for role access
    const isOwner = checkOwner(id, roles, owner);
    const isModerator = checkModerator(id, roles, moderators);
    const isRep = checkRep(rep, roles)

    if (method === 'post') {
        console.log()
        if (!isOwner && !isModerator) throw('User does not have access to that method');
        return true;
    }
    if (method === 'put') {
        if (!isOwner && !isModerator) throw('User does not have access to that route');
        // block access to organization editing
        if (!isOwner && collection && collection.name === 'organizations') throw('An error occoured while validating your credentials')
        return true;
    }
    if (method === 'delete') throw('User does not have access to that method');
}

function checkOwner(id, roles, owner) {
    // admins have universal access
    if (roles.includes('admin')) return true;
    // user is the organization owner - need to use .equals (object id comparison from mongoose) to check id's
    if (owner && owner._id.equals(id)) return true

    return false;
}

function checkModerator(id, roles, moderators) {
    // admins have universal access
    if (roles.includes('admin')) return true;
    // user is a mod
    if (moderators && moderators.some((mod) => mod._id.equals(id))) {
        return true;
    }

    return false;
}

function checkRep(repObject, roles) {
    if (!roles.includes('rep')) return false
    if (!repObject) return false

    return true
}

function checkUrl (req) {
    let { organization } = req

    let url = req.get('referer');
    url = url.replace(/(^\w+:|^)\/\//, '');
    const [domain, ...rest] = url.split('.');

    return domain === organization.url
}

/*
// need to find the organization that the user is currently viewing (the url)
// this is NOT the organization that the content belongs to (not the object.organizations)
// N.B new content will have no organization
async function canAccessOrganization(req, object) {
    const user = req.user;
    const method = req.method.toLowerCase();
    let organization = null;
    let orgUrl = null;
    const { user, method, organization } = req;
    if (!organization) throw('No organization discovered in request body')
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
        if (object.collection && object.collection.name === 'organizations') {
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
            debugger;
            // updating other content so need to check organization owner and moderators
            return true;
        }
    } else if (method === 'delete') {
        // On delete requests on admins have access to delete requests
        return Promise.resolve(false);
    }
}
  // allowed test failed, is this a non GET request? (POST/UPDATE/DELETE)
            if (req.method.toLowerCase() !== 'get' && user) {
                //check for org owner or moderator on all non get requests
                // this requires a DB query so only use it when necesary
                await canAccessOrganization(req, object)
                .then(result => {
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
            }

*/
