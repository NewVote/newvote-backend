'use strict';

/**
 * Module dependencies.
 */
let acl = require('acl'),
    mongoose = require('mongoose'),
    organizationController = require('./organizations/organizations.server.controller'),
    Organization = mongoose.model('Organization'),
    Rep = mongoose.model('Rep'),
    ObjectId = require('mongodb').ObjectID

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
    '/api/progress',
    '/api/reps',
    '/api/notifications',
    '/api/subscriptions'
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
    '/api/progress/:progressId',
    '/api/reps/:repId',
    '/api/notifications/:notificationId',
    '/api/subscriptions/:subscriptionId'
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
                '/api/proposals',
                '/api/notifications'
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
        req.rep ||
        req.progress ||
        req.notification

    // Check fo r user roles
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
    const isAdmin = checkAdmin(id, roles);
    const isOwner = checkOwner(id, roles, owner);
    const isModerator = checkModerator(id, roles, moderators);
    const isRep = checkRep(rep, roles)
    const isCreator = checkCreator(id, object)

    if (method === 'post') {
        if (!isOwner && !isModerator) throw('User does not have access to that method');
        return true;
    }
    if (method === 'put') {
        if (!isOwner && !isModerator && !isCreator) throw('User does not have access to that route');
        // block access to organization editing
        if (!isOwner && collection && collection.name === 'organizations') throw('An error occoured while validating your credentials')
        return true;
    }
    if (method === 'delete') throw('User does not have access to that method');

}

function checkAdmin(id, roles) {
    if (roles.includes('admin')) return true;
    return false
}

function checkOwner(id, roles, owner) {
    // admins have universal access
    if (checkAdmin(id, roles)) return true;
    // user is the organization owner - need to use .equals (object id comparison from mongoose) to check id's
    if (owner && owner._id.equals(id)) return true

    return false;
}

function checkModerator(id, roles, moderators) {
    // admins have universal access
    if (checkAdmin(id, roles)) return true;
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

function checkCreator(id, object) {
    if (!object || !id || !object.user || !object.user._id) return false
    const userId = ObjectId(id)
    const entityOwnerId = ObjectId(object.user._id)
    if (!userId || !entityOwnerId) return false

    return userId.equals(entityOwnerId);
}

function checkUrl (req) {
    let { organization } = req

    let url = req.get('referer');
    url = url.replace(/(^\w+:|^)\/\//, '');
    const [domain, ...rest] = url.split('.');

    return domain === organization.url
}
