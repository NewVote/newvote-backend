'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Vote = mongoose.model('Vote'),
    Region = mongoose.model('Region'),
    Organization = mongoose.model('Organization'),
    User = mongoose.model('User'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash');

/**
 * Create a vote
 */
exports.create = function(req, res) {
    let vote = new Vote(req.body);
    vote.user = req.user;

    vote.save()
        .then(vote => {
            return res.json(vote);
        })
        .catch(err => {
            throw err;
        });
};

exports.updateOrCreate = async function(req, res) {
    let user = req.user;
    const { object, organizationId } = req.body;

    const isVerified = await isUserSignedToOrg(organizationId, user);
    const hasVotePermission = await checkOrgVotePermissions(organizationId, user);

    if (!isVerified) {
        return res.status(403).send({
            message:
                'You must verify with Community before being able to vote.',
            notCommunityVerified: true
        });
    }

    if (!hasVotePermission) {
        return res.status(403).send({
            message:
                'You do not have permission to vote on this organization'
        });
    }

    Vote.findOne({
        user: user,
        object: object
    })
        .then(vote => {
            if (!vote) return exports.create(req, res);
            req.vote = vote;
            return exports.update(req, res);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Show the current vote
 */
exports.read = function(req, res) {
    res.json(req.vote);
};

/**
 * Update a vote
 */
exports.update = function(req, res) {
    let vote = req.vote;
    _.extend(vote, req.body);
    // vote.title = req.body.title;
    // vote.content = req.body.content;
    vote.save()
        .then(vote => {
            return res.json(vote);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Delete an vote
 */
exports.delete = function(req, res) {
    let vote = req.vote;

    vote.remove(function(err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(vote);
        }
    });
};

/**
 * List of Votes
 */
exports.list = function(req, res) {
    let regionIds = req.query.regionId;

    if (regionIds) {
        getPostcodes(regionIds).then(
            function(postCodes) {
                console.log(postCodes);
                // Find votes submitted from users with those postcodes
                getVotesResponse(
                    {},
                    {
                        path: 'user',
                        match: {
                            postalCode: {
                                $in: postCodes
                            }
                        },
                        select: 'postalCode -_id'
                    },
                    res
                );
            },
            function(err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err)
                });
            }
        );
    } else {
        getVotesResponse(
            {},
            {
                path: 'user',
                select: 'postalCode -_id'
            },
            res
        );
    }
};

/**
 * Vote middleware
 */
exports.voteByID = function(req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Vote is invalid'
        });
    }

    Vote.findById(id)
        .populate('user', 'displayName')
        .exec(function(err, vote) {
            if (err) {
                return next(err);
            } else if (!vote) {
                return res.status(404).send({
                    message: 'No vote with that identifier has been found'
                });
            }
            req.vote = vote;
            next();
        });
};

exports.attachVotes = function(objects, user, regions) {
    if (!objects) return Promise.resolve(objects);
    let objectIds = objects.map(function(object) {
        return object._id;
    });

    return Promise.resolve(regions).then(function(regionString) {
        if (regionString) {
            let regionIds = [];

            if (isString(regionString)) {
                let region = JSON.parse(regionString);
                regionIds.push(region._id);
            } else {
                regionIds = regionString.map(function(regionObj) {
                    let region = JSON.parse(regionObj);
                    return region._id;
                });
            }

            return getPostcodes(regionIds).then(function(postCodes) {
                // Find votes submitted from users with those postcodes
                return getVotes(
                    {
                        object: {
                            $in: objectIds
                        }
                    },
                    {
                        path: 'user',
                        match: {
                            $or: [
                                {
                                    postalCode: {
                                        $in: postCodes
                                    }
                                },
                                {
                                    woodfordian: {
                                        $in: postCodes
                                    }
                                }
                            ]
                        },
                        select: 'postalCode -_id'
                    }
                ).then(function(votes) {
                    return mapObjectWithVotes(objects, user, votes);
                });
            });
        } else {
            return getVotes(
                {
                    object: {
                        $in: objectIds
                    }
                },
                null
            ).then(function(votes) {
                votes.forEach(function(vote) {
                    fixVoteTypes(vote);
                });
                return mapObjectWithVotes(objects, user, votes);
            });
        }
    });
};

// Local functions
function fixVoteTypes(vote) {
    // fixing a bug where vote object types were being incorrectly set
    // now the database is populated with votes with objectType of 'proposal'

    if (vote.objectType === 'proposal') {
        console.log('found vote to fix');
        vote.objectType = 'Proposal';
        vote.save().then(function(vote) {
            console.log('vote updated: ', vote._id);
        });
    }
}

function getVotesResponse(findQuery, populateQuery, res) {
    getVotes(findQuery, populateQuery).then(
        function(votes) {
            res.json(votes);
        },
        function(err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        }
    );
}

function getVotes(findQuery, populateQuery) {
    if (populateQuery != null) {
        return Vote.find(findQuery)
            .populate(populateQuery)
            .exec()
            .then(function(votes) {
                votes = votes.filter(function(vote) {
                    if (vote.user) return vote;
                });
                return votes;
            });
    } else {
        return Vote.find(findQuery)
            .exec()
            .then(function(votes) {
                votes = votes.filter(function(vote) {
                    if (vote.user) return vote;
                });
                return votes;
            });
    }
}

function getPostcodes(regionIds) {
    return Region.find({
        _id: {
            $in: regionIds
        }
    })
        .exec()
        .then(function(regions) {
            // Get postcodes from all regions
            let postCodes = [];
            let region;
            for (region in regions) {
                postCodes = postCodes.concat(regions[region].postcodes);
            }
            return postCodes;
        });
}

function mapObjectWithVotes(objects, user, votes) {
    objects = objects.map(function(object) {
        // object = object.toObject(); //to be able to set props on the mongoose object
        let objVotes = [];
        let userVote = null;
        let up = 0;
        let down = 0;
        let total = 0;
        object.votes = {};

        votes.forEach(function(vote) {
            if (vote.object.toString() === object._id.toString()) {
                objVotes.push(vote);
                if (user && vote.user.toString() === user._id.toString()) {
                    userVote = vote;
                }
                if (vote.voteValue) {
                    if (vote.voteValue > 0) up++;
                    else down++;
                }
            }
        });

        object.votes = {
            total: objVotes.length,
            currentUser: userVote,
            up: up,
            down: down
        };

        return object;
    });

    return objects;
}

function isString(value) {
    return typeof value === 'string' || value instanceof String;
}

function isUserSignedToOrg(currentOrgId, userObject) {
    return User.findById(userObject._id)
        .then(user => {
            if (!user) return false;
            if (!user.organizations || user.organizations.length < 1)
                return false;

            return user.organizations;
        })
        .then(organizations => {
            if (!organizations) return false;
            const orgExists = organizations.find(org => {
                return org.equals(currentOrgId);
            });

            return orgExists;
        });
}

function checkOrgVotePermissions (organizationId, user) {

    const orgPromise = Organization.findById(organizationId);
    const userPromise = User.findOne({ _id: user._id })

    return Promise.all([orgPromise, userPromise])
        .then((promises) => {
            const [organization, user] = promises;

            if (!organization || !user) throw('Could not find user / organization data')
            if (organization.authType === 0) return true; 

            const providerData = user.providerData.find((provider) => {
                // Filter through providers to find the matching organization
                return provider.organization === organization.url;
            })

            if (providerData) throw('No Matching Provider data');

            return checkPermissions(providerData.edupersonscopedaffiliation, organization.voteRoles);
        })
}

function checkPermissions(userRole, organizationRoles) {
    const filteredRole = organizationRoles.filter((roleObject) => {
        return roleObject.role === userRole;
    });

    return filteredRole.active;
}