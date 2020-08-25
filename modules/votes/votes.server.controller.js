'use strict'

const { issueByID } = require('../issues/issues.server.controller')

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Vote = mongoose.model('Vote'),
    Region = mongoose.model('Region'),
    Organization = mongoose.model('Organization'),
    Solution = mongoose.model('Solution'),
    Proposal = mongoose.model('Proposal'),
    User = mongoose.model('User'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    socket = require('../helpers/socket'),
    _ = require('lodash')

/**
 * Create a vote
 */
exports.create = function (req, res) {
    const org = JSON.parse(req.cookies.organization).url
    let vote = new Vote(req.body)
    vote.user = req.user
    // Check if user had auto issue subscriptions from votes in profile
    const userPromise = User.findOne({ _id: req.user._id })
    const votePromise = Vote.populate(vote, { path: 'object' })

    Promise.all([userPromise, votePromise]).then(([userData, voteData]) => {
        const { subscriptions } = userData
        const { objectType } = voteData

        // do notsubscribe to suggestion parents
        if (voteData.objectType === 'Suggestion') {
            return false
        }

        // User has not setup profile
        if (!subscriptions[req.organization._id]) {
            return false
        }

        // user has not signed up to auto updates so do nothing
        if (!subscriptions[req.organization._id].autoUpdates) {
            return false
        }
        // user has signed up to auto issue subscriptions on current organization
        // take the current vote and check whether it is for a solution / action
        // and find it's parent

        if (objectType === 'Proposal') {
            return getIssueIdsFromProposalObject(
                voteData.object.solutions,
            ).then((issueIds) => {
                return updateUserSubscriptionsWithSolutionsIssueIds(
                    issueIds,
                    req.user,
                    req.organization,
                )
            })
        }

        if (objectType === 'Solution') {
            const {
                object: { issues },
            } = voteData
            return updateUserSubscriptionsWithSolutionsIssueIds(
                issues,
                req.user,
                req.organization,
            )
        }
    })

    vote.save()
        .then((vote) => {
            return Vote.find({
                object: vote.object,
            })
        })
        .then((votes) => {
            const voteMetaData = {
                up: 0,
                down: 0,
                total: 0,
                _id: vote.object._id,
            }

            votes.forEach((item) => {
                if (item.voteValue > 0) voteMetaData.up++
                if (item.voteValue < 0) voteMetaData.down++
            })

            voteMetaData.total = voteMetaData.up + voteMetaData.down
            socket.send(req, voteMetaData, 'vote', org)

            return vote
        })
        .then((data) => {
            return User.findOne({ _id: req.user._id })
                .select('-password -verificationCode -email -salt')
                .then((user) => {
                    // depopulate object field client only needs the objectId in vote data structure
                    vote.depopulate('object')
                    res.json({
                        vote: data,
                        subscriptions: user.subscriptions,
                    })
                })
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.updateOrCreate = async function (req, res) {
    let user = req.user
    const { object, organizationId } = req.body
    try {
        const isVerified = await isUserSignedToOrg(organizationId, user)
        if (!isVerified) throw 'User is not verified'
    } catch (error) {
        return res.status(403).send({
            message:
                'You must verify with Community before being able to vote.',
            notCommunityVerified: true,
        })
    }

    try {
        const hasVotePermission = await checkOrgVotePermissions(
            organizationId,
            user,
        )

        if (!hasVotePermission) throw 'User does not have permission'
    } catch (err) {
        return res.status(403).send({
            message: 'You do not have permission to vote on this organization',
        })
    }

    Vote.findOne({
        user: user,
        object: object,
    })
        .then((vote) => {
            if (!vote) return exports.create(req, res)
            req.vote = vote
            return exports.update(req, res)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Show the current vote
 */
exports.read = function (req, res) {
    res.json(req.vote)
}

/**
 * Update a vote
 */
exports.update = function (req, res) {
    const org = req.organization.url
    let vote = req.vote
    _.extend(vote, req.body)

    if (req.body.voteValue === 0) {
        vote.voteValue = 0
    }

    // Check if user had auto issue subscriptions from votes in profile
    const userPromise = User.findOne({ _id: req.user._id })
    const votePromise = Vote.populate(vote, { path: 'object' })

    Promise.all([userPromise, votePromise]).then(([userData, voteData]) => {
        const { subscriptions } = userData
        const { objectType } = voteData

        // do notsubscribe to suggestion parents
        if (voteData.objectType === 'Suggestion') {
            return false
        }

        // User has not setup profile
        if (!subscriptions || !subscriptions[req.organization._id]) {
            return false
        }

        // user has not signed up to auto updates so do nothing
        if (!subscriptions[req.organization._id].autoUpdates) {
            return false
        }
        // user has signed up to auto issue subscriptions on current organization
        // take the current vote and check whether it is for a solution / action
        // and find it's parent

        if (objectType === 'Proposal') {
            return getIssueIdsFromProposalObject(
                voteData.object.solutions,
            ).then((issueIds) => {
                return updateUserSubscriptionsWithSolutionsIssueIds(
                    issueIds,
                    req.user,
                    req.organization,
                )
            })
        }

        if (objectType === 'Solution') {
            const {
                object: { issues },
            } = voteData
            return updateUserSubscriptionsWithSolutionsIssueIds(
                issues,
                req.user,
                req.organization,
            )
        }
    })

    vote.save()
        .then((vote) => {
            // search for all votes related to the updated object
            return Vote.find({
                object: vote.object,
            })
        })
        .then((votes) => {
            // recalculate vote values
            const voteMetaData = {
                up: 0,
                down: 0,
                total: 0,
                _id: vote.object._id,
            }

            votes.forEach((item) => {
                if (item.voteValue > 0) voteMetaData.up++
                if (item.voteValue < 0) voteMetaData.down++
            })
            voteMetaData.total = voteMetaData.up + voteMetaData.down

            socket.send(req, voteMetaData, 'vote', org)
            return User.findOne({ _id: req.user._id })
                .select('-password -verificationCode -email -salt')
                .then((user) => {
                    // depopulate object field client only needs the objectId in vote data structure
                    vote.depopulate('object')
                    return res.json({
                        vote,
                        subscriptions: user.subscriptions,
                    })
                })
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Delete an vote
 */
exports.delete = function (req, res) {
    let vote = req.vote

    vote.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        } else {
            res.json(vote)
        }
    })
}

/**
 * List of Votes
 */
exports.list = function (req, res) {
    let regionIds = req.query.regionId

    if (regionIds) {
        getPostcodes(regionIds).then(
            function (postCodes) {
                // Find votes submitted from users with those postcodes
                getVotesResponse(
                    {},
                    {
                        path: 'user',
                        match: {
                            postalCode: {
                                $in: postCodes,
                            },
                        },
                        select: 'postalCode -_id',
                    },
                    res,
                )
            },
            function (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err),
                })
            },
        )
    } else {
        getVotesResponse(
            {},
            {
                path: 'user',
                select: 'postalCode -_id',
            },
            res,
        )
    }
}

/**
 * Vote middleware
 */
exports.voteByID = function (req, res, next, id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).send({
            message: 'Vote is invalid',
        })
    }

    Vote.findById(id)
        .populate('user', 'displayName')
        .exec(function (err, vote) {
            if (err) {
                return next(err)
            } else if (!vote) {
                return res.status(404).send({
                    message: 'No vote with that identifier has been found',
                })
            }
            req.vote = vote
            next()
        })
}

exports.attachVotes = function (objects, user, regions) {
    if (!objects) return Promise.resolve(objects)
    let objectIds = objects.map(function (object) {
        return object._id
    })

    return Promise.resolve(regions).then(function (regionString) {
        if (regionString) {
            let regionIds = []

            if (isString(regionString)) {
                let region = JSON.parse(regionString)
                regionIds.push(region._id)
            } else {
                regionIds = regionString.map(function (regionObj) {
                    let region = JSON.parse(regionObj)
                    return region._id
                })
            }

            return getPostcodes(regionIds).then(function (postCodes) {
                // Find votes submitted from users with those postcodes
                return getVotes(
                    {
                        object: {
                            $in: objectIds,
                        },
                    },
                    {
                        path: 'user',
                        match: {
                            $or: [
                                {
                                    postalCode: {
                                        $in: postCodes,
                                    },
                                },
                                {
                                    woodfordian: {
                                        $in: postCodes,
                                    },
                                },
                            ],
                        },
                        select: 'postalCode -_id',
                    },
                ).then(function (votes) {
                    return mapObjectWithVotes(objects, user, votes)
                })
            })
        } else {
            return getVotes(
                {
                    object: {
                        $in: objectIds,
                    },
                },
                null,
            ).then(function (votes) {
                votes.forEach(function (vote) {
                    fixVoteTypes(vote)
                })
                return mapObjectWithVotes(objects, user, votes)
            })
        }
    })
}

// Local functions
function fixVoteTypes(vote) {
    // fixing a bug where vote object types were being incorrectly set
    // now the database is populated with votes with objectType of 'proposal'

    if (vote.objectType === 'proposal') {
        vote.objectType = 'Proposal'
        vote.save()
    }
}

function getVotesResponse(findQuery, populateQuery, res) {
    getVotes(findQuery, populateQuery).then(
        function (votes) {
            res.json(votes)
        },
        function (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        },
    )
}

function getVotes(findQuery, populateQuery) {
    if (populateQuery != null) {
        return Vote.find(findQuery)
            .populate(populateQuery)
            .exec()
            .then(function (votes) {
                votes = votes.filter(function (vote) {
                    if (vote.user) return vote
                })
                return votes
            })
    } else {
        return Vote.find(findQuery)
            .exec()
            .then(function (votes) {
                votes = votes.filter(function (vote) {
                    if (vote.user) return vote
                })
                return votes
            })
    }
}

function getPostcodes(regionIds) {
    return Region.find({
        _id: {
            $in: regionIds,
        },
    })
        .exec()
        .then(function (regions) {
            // Get postcodes from all regions
            let postCodes = []
            let region
            for (region in regions) {
                postCodes = postCodes.concat(regions[region].postcodes)
            }
            return postCodes
        })
}

function mapObjectWithVotes(objects, user, votes) {
    objects = objects.map(function (object) {
        // object = object.toObject(); //to be able to set props on the mongoose object
        let objVotes = []
        let userVote = null
        let up = 0
        let down = 0
        let total = 0
        let _id = object._id

        object.votes = {}

        votes.forEach(function (vote) {
            if (vote.object.toString() === object._id.toString()) {
                objVotes.push(vote)
                if (user && vote.user.toString() === user._id.toString()) {
                    userVote = vote
                }
                if (vote.voteValue) {
                    if (vote.voteValue > 0) up++
                    else down++
                }
            }
        })

        object.votes = {
            _id,
            total: up + down,
            currentUser: userVote,
            up: up,
            down: down,
        }

        return object
    })

    return objects
}

function isString(value) {
    return typeof value === 'string' || value instanceof String
}

async function isUserSignedToOrg(currentOrgId, userObject) {
    return User.findById(userObject._id)
        .then((user) => {
            if (!user) return false
            if (!user.organizations || user.organizations.length < 1)
                return false

            return user.organizations
        })
        .then((organizations) => {
            if (!organizations) return false
            const orgExists = organizations.find((org) => {
                if (!org) return false
                return org.equals(currentOrgId)
            })

            return orgExists
        })
}

async function checkOrgVotePermissions(organizationId, user) {
    const orgPromise = Organization.findById(organizationId)
    const userPromise = User.findOne({
        _id: user._id,
    })

    return Promise.all([orgPromise, userPromise])
        .then((promises) => {
            const [organization, user] = promises

            if (!organization || !user)
                throw 'Could not find user / organization data'
            if (organization.authType === 0) return true

            const providerData = user.providerData[organization.url]

            if (!providerData) throw 'No Matching Provider data'

            return checkPermissions(
                providerData.edupersonscopedaffiliation,
                organization.voteRoles,
            )
        })
        .catch((err) => {
            throw err
        })
}

function checkPermissions(userRole, organizationRoles) {
    const filteredRole = organizationRoles.find((roleObject) => {
        return userRole.includes(roleObject.role)
    })

    if (!filteredRole) throw 'User does not have permission to vote'

    return filteredRole.active
}

exports.getTotalVotes = async function (req, res) {
    const { organization } = req

    // if (!req.user) throw 'User is not signed in'

    const solutions = await Solution.find({
        organizations: { $in: [organization._id] },
    }).then((solutions) => {
        return {
            objectIds: solutions.map((solution) => {
                return solution._id
            }),
            total: solutions.length,
        }
    })

    const proposals = await Proposal.find({
        organizations: { $in: [organization._id] },
    }).then((proposals) => {
        return {
            objectIds: proposals.map((proposal) => {
                return proposal._id
            }),
            total: proposals.length,
        }
    })

    await Vote.find({
        user: req.user._id,
        object: { $in: solutions.objectIds.concat(proposals.objectIds) },
    }).then((data) => {
        const totalVotes = data.filter((vote) => {
            return vote.voteValue !== 0
        })

        const totals = {
            votes: totalVotes.length,
            entities: solutions.total + proposals.total,
        }
        return res.json(totals)
    })
}

const getIssueIdsFromProposalObject = (solutionIds) => {
    return Solution.find({ _id: { $in: solutionIds } }).then((solutions) => {
        const issueIds = []
        // map the array of solutions to return a 2d array of parent issues
        return solutions
            .map((solution) => {
                return solution.issues
            })
            .reduce((prev, curr) => {
                // flatten the 2d array to we are left with a 1d array of issue ids
                return prev.concat(...curr)
            }, [])
            .forEach((issueId) => {
                // push unique object ids to issueIds array
                if (issueIds.includes(issueId)) {
                    return false
                }

                return issueIds.push(issueId)
            })
    })
}

const updateUserSubscriptionsWithSolutionsIssueIds = (
    issueIds,
    user,
    organization,
) => {
    return User.findOne({ _id: user._id }).then((user) => {
        const { subscriptions } = user

        if (!subscriptions[organization._id]) {
            return false
        }

        issueIds.forEach((issueId) => {
            // search the subscriptions obejct for the issues array
            // then compare the current issueId with each issue
            const idExists = subscriptions[organization._id].issues.find(
                (id) => {
                    if (id.equals(issueId)) {
                        return true
                    }
                    return false
                },
            )

            if (idExists) return false

            user.subscriptions[organization._id].issues.push(issueId)
            return true
        })

        user.markModified('subscriptions')
        return user.save()
    })
}
