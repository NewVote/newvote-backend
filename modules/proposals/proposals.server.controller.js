'use strict'

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Proposal = mongoose.model('Proposal'),
    Vote = mongoose.model('Vote'),
    votes = require('../votes/votes.server.controller'),
    Solution = mongoose.model('Solution'),
    voteController = require('../votes/votes.server.controller'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    _ = require('lodash'),
    seed = require('./seed/seed'),
    createSlug = require('../helpers/slug')

/**
 * Create a proposal
 */
exports.create = function (req, res) {
    // if the string is empty revert to default on model
    if (!req.body.imageUrl) {
        delete req.body.imageUrl
    }

    const proposalPromise = new Promise((resolve, reject) => {
        let proposal = new Proposal(req.body)
        proposal.user = req.user

        Proposal.generateUniqueSlug(req.body.title, null, function (slug) {
            proposal.slug = slug
            resolve(proposal)
        })
    })

    // Return votes without an _id - as it cannot be deleted
    // _id being preset prevents copying and saving of vote data between collections
    const votePromise = new Promise((resolve, reject) => {
        if (req.body.suggestionTemplate) {
            return resolve(
                Vote.find({
                    object: req.body.suggestionTemplate._id || false,
                    objectType: 'Suggestion',
                }).select('-_id -created'),
            )
        }

        return resolve(false)
    })

    Promise.all([proposalPromise, votePromise])
        .then((promises) => {
            const [proposal, votes] = promises

            if (!proposal) throw 'Proposal failed to save'

            if (votes.length > 0) {
                const convertSuggestionVotesToProposal = votes
                    .slice()
                    .map((vote) => {
                        let newVote = new Vote(vote)
                        newVote.objectType = 'Proposal'
                        newVote.object = proposal._id
                        return newVote
                    })

                Vote.insertMany(convertSuggestionVotesToProposal)
            }

            return proposal.save()
        })
        .then((proposal) => {
            // Attach empty vote object
            return votes.attachVotes([proposal], req.user, req.query.regions)
        })
        .then((proposal) => {
            return res.json(proposal[0])
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Show the current proposal
 */
exports.read = function (req, res) {
    const proposals = [req.proposal]
    const getVoteMetaData = voteController.getVoteMetaData(proposals)

    if (!req.user) {
        return getVoteMetaData.then((data) => {
            const response = {
                proposals,
                voteMetaData: data,
            }

            return res.json(response)
        })
    }

    const getUserVoteData = voteController.getUserVotes(proposals, req.user)

    return Promise.all([getVoteMetaData, getUserVoteData])
        .then((voteMetaData, userVoteData) => {
            const response = {
                proposals,
                voteMetaData,
                userVoteData,
            }
            return res.json(response)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Update a proposal
 */
exports.update = function (req, res) {
    delete req.body.__v

    if (req.body.votes) {
        delete req.body.votes
    }

    let proposal = req.proposal
    _.extend(proposal, req.body)
    proposal.user = req.user

    if (!proposal.slug || createSlug(proposal.title) !== proposal.slug) {
        return Proposal.generateUniqueSlug(proposal.title, null, function (
            slug,
        ) {
            proposal.slug = slug

            proposal
                .save()
                .then((res) => {
                    return voteController.attachVotes(
                        [res],
                        req.user,
                        req.query.regions,
                    )
                })
                .then((data) => {
                    res.json(data[0])
                })
                .catch((err) => {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err),
                    })
                })
        })
    }

    proposal
        .save()
        .then((res) => {
            return voteController.attachVotes(
                [res],
                req.user,
                req.query.regions,
            )
        })
        .then((proposal) => res.json(proposal[0]))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Delete an proposal
 */
exports.delete = function (req, res) {
    let proposal = req.proposal

    Vote.deleteMany({
        object: req.proposal._id,
        objectType: 'Proposal',
    })
        .then((votes) => {
            return proposal.remove()
        })
        .then((proposal) => {
            return res.json(proposal)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * List of Proposals
 */
exports.list = function (req, res) {
    let solutionId = req.query.solutionId || null
    let search = req.query.search || null
    let org = req.organization
    let orgUrl = org ? org.url : null
    let showDeleted = req.query.showDeleted || null

    let orgMatch = orgUrl
        ? {
              'organizations.url': orgUrl,
          }
        : {}
    let solutionMatch = solutionId
        ? {
              solutions: mongoose.Types.ObjectId(solutionId),
          }
        : {}
    let searchMatch = search
        ? {
              $text: {
                  $search: search,
              },
          }
        : {}

    let showNonDeletedItemsMatch = {
        $or: [
            {
                softDeleted: false,
            },
            {
                softDeleted: {
                    $exists: false,
                },
            },
        ],
    }
    let showAllItemsMatch = {}
    let softDeleteMatch = showDeleted
        ? showAllItemsMatch
        : showNonDeletedItemsMatch

    Proposal.aggregate([
        {
            $match: searchMatch,
        },
        {
            $match: softDeleteMatch,
        },
        {
            $match: solutionMatch,
        },
        {
            $lookup: {
                from: 'organizations',
                localField: 'organizations',
                foreignField: '_id',
                as: 'organizations',
            },
        },
        {
            $lookup: {
                from: 'solutions',
                localField: 'solutions',
                foreignField: '_id',
                as: 'solutions',
            },
        },
        {
            $match: orgMatch,
        },
        {
            $unwind: '$organizations',
        },
        {
            $sort: {
                created: -1,
            },
        },
    ]).exec(function (err, proposals) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        }

        // If there is no user return entities + vote totals for those entities
        // once logged in, return user votes
        const getVoteMetaData = votes.getVoteMetaData(proposals)
        if (!req.user) {
            return getVoteMetaData.then((data) => {
                const response = {
                    proposals,
                    voteMetaData: data,
                }

                return res.json(response)
            })
        }

        const getUserVoteData = votes.getUserVotes(proposals, req.user)

        return Promise.all([getVoteMetaData, getUserVoteData])
            .then((voteMetaData, userVoteData) => {
                const response = {
                    proposals,
                    voteMetaData: voteMetaData,
                    userVoteData,
                }
                return res.json(response)
            })
            .catch(function (err) {
                return res.status(500).send({
                    message: errorHandler.getErrorMessage(err),
                })
            })
    })
}

/**
 * Proposal middleware
 */
exports.proposalByID = function (req, res, next, id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return Proposal.findOne({
            slug: id,
        })
            .populate('user', 'displayName')
            .populate('solutions')
            .populate('solution')
            .populate('organizations')
            .then((proposal) => {
                if (!proposal) throw 'Proposal does not exist'

                req.proposal = proposal
                next()
            })
            .catch((err) => {
                return res.status(400).send({
                    message: err,
                })
            })
    }

    Proposal.findById(id)
        .populate('user', 'displayName')
        .populate('solutions')
        .populate('solution')
        .populate('organizations')
        .exec(function (err, proposal) {
            if (err) {
                return next(err)
            } else if (!proposal) {
                return res.status(404).send({
                    message: 'No proposal with that identifier has been found',
                })
            }
            req.proposal = proposal
            next()
        })
}

exports.attachProposals = function (objects, user, regions) {
    // ;
    const promises = objects.map((obj) => {
        return Proposal.find({
            solutions: obj._id,
        })
            .populate('solutions')
            .then((props) => {
                return votes.attachVotes(props, user, regions).then((props) => {
                    obj.proposals = props
                    return obj
                })
            })
    })
    return Promise.all(promises)
}

function updateSchema(proposals) {
    console.log('schema update called')
    for (let i = 0; i < proposals.length; i++) {
        let proposal = proposals[i]
        console.log('testing: ', proposal.title)
        if (proposal.goals && proposal.goals.length > 0) {
            proposal.solutions = proposal.goals
            // proposal.goal = undefined;
            proposal.goals = undefined
            delete proposal.goals

            console.log('updated: ', proposal.title)
            proposal.save().then(() => console.log('saved proposal'))
        }
    }
}

exports.seedData = function (organizationId, solutionId) {
    const { seedData } = seed
    const newProposal = new Proposal(seedData)
    newProposal.organizations = organizationId
    newProposal.solutions = [solutionId]
    newProposal.save()
    return newProposal
}
