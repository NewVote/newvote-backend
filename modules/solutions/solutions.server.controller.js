'use strict'

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Solution = mongoose.model('Solution'),
    Suggestion = mongoose.model('Suggestion'),
    Vote = mongoose.model('Vote'),
    voteController = require('../votes/votes.server.controller'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    votes = require('../votes/votes.server.controller'),
    proposals = require('../proposals/proposals.server.controller'),
    _ = require('lodash'),
    seed = require('./seed/seed'),
    createSlug = require('../helpers/slug')

/**
 * Create a solution
 */
exports.create = function (req, res) {
    // if the string is empty revert to default on model
    if (!req.body.imageUrl) {
        delete req.body.imageUrl
    }

    const solutionPromise = new Promise((resolve, reject) => {
        let solution = new Solution(req.body)
        solution.user = req.user

        Solution.generateUniqueSlug(req.body.title, null, function (slug) {
            solution.slug = slug
            resolve(solution)
        })
    })

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

    Promise.all([solutionPromise, votePromise])
        .then((promises) => {
            const [solution, votes] = promises

            if (!solution) throw 'Solution failed to create'

            if (votes.length > 0) {
                const convertSuggestionVotesToSolution = votes
                    .slice()
                    .map((vote) => {
                        let newVote = new Vote(vote)
                        newVote.objectType = 'Solution'
                        newVote.object = solution._id
                        return newVote
                    })

                Vote.insertMany(convertSuggestionVotesToSolution)
            }

            return solution.save()
        })
        .then((solution) => {
            // Attach empty vote object
            return votes.attachVotes([solution], req.user, req.query.regions)
        })
        .then((solution) => {
            return res.json(solution[0])
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Show the current solution
 */
exports.read = function (req, res) {
    const solutions = [req.solution]
    const getVoteMetaData = voteController.getVoteMetaData(solutions)

    if (!req.user) {
        return getVoteMetaData.then((data) => {
            const response = {
                solutions,
                voteMetaData: data,
            }

            return res.json(response)
        })
    }

    const getUserVoteData = voteController.getUserVotes(solutions, req.user)

    return Promise.all([getVoteMetaData, getUserVoteData])
        .then((voteMetaData, userVoteData) => {
            const response = {
                solutions,
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
 * Update a solution
 */
exports.update = function (req, res) {
    delete req.body.__v

    if (req.body.votes) {
        delete req.body.votes
    }

    let solution = req.solution
    _.extend(solution, req.body)
    // solution.title = req.body.title;
    // solution.content = req.body.content;

    if (!solution.slug || createSlug(solution.title) !== solution.slug) {
        return Solution.generateUniqueSlug(solution.title, null, function (
            slug,
        ) {
            solution.slug = slug

            solution
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

    solution
        .save()
        .then((res) => {
            return voteController.attachVotes(
                [res],
                req.user,
                req.query.regions,
            )
        })
        .then((solution) => {
            res.json(solution[0])
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * Delete an solution
 */
exports.delete = function (req, res) {
    let solution = req.solution

    Vote.deleteMany({
        object: req.solution._id,
        objectType: 'Solution',
    })
        .then((votes) => {
            return solution.remove()
        })
        .then((solution) => {
            return res.json(solution)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

/**
 * List of Solutions
 */
exports.list = function (req, res) {
    let issueId = req.query.issueId || null
    let issueMatch = {}
    if (issueId) {
        issueMatch = isSlug(issueId)
            ? {
                  'issues.slug': issueId,
              }
            : {
                  issues: mongoose.Types.ObjectId(issueId),
              }
    }

    let search = req.query.search || null
    let org = req.organization
    let orgUrl = org ? org.url : null
    let showDeleted = req.query.showDeleted || null

    let orgMatch = orgUrl
        ? {
              'organizations.url': orgUrl,
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

    Solution.aggregate([
        {
            $match: searchMatch,
        },
        {
            $match: softDeleteMatch,
        },
        {
            $lookup: {
                from: 'issues',
                localField: 'issues',
                foreignField: '_id',
                as: 'issues',
            },
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
            $match: orgMatch,
        },
        {
            $match: issueMatch,
        },
        {
            $unwind: '$organizations',
        },
        {
            $sort: {
                created: -1,
            },
        },
    ]).exec(function (err, solutions) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        }

        // If there is no user return entities + vote totals for those entities
        // once logged in, return user votes
        const populateSolutions = Solution.populate(solutions, {
            path: 'proposals',
        })
        const getVoteMetaData = votes.getVoteMetaData(solutions)
        if (!req.user) {
            return Promise.all([populateSolutions, getVoteMetaData]).then(
                ([solutions, voteMetaData]) => {
                    const response = {
                        solutions,
                        voteMetaData,
                    }

                    return res.json(response)
                },
            )
        }

        const getUserVoteData = votes.getUserVotes(solutions, req.user)

        return Promise.all([
            populateSolutions,
            getVoteMetaData,
            getUserVoteData,
        ])
            .then(([solutions, voteMetaData, userVoteData]) => {
                const response = {
                    solutions,
                    voteMetaData: voteMetaData,
                    userVoteData,
                }
                return res.json(response)
            })
            .catch(function (err) {
                res.status(500).send({
                    message: errorHandler.getErrorMessage(err),
                })
            })
    })
}

/**
 * Solution middleware
 */
exports.solutionByID = function (req, res, next, id) {
    if (isSlug(id)) {
        return Solution.findOne({
            slug: id,
        })
            .populate('user', 'displayName')
            .populate('issues')
            .populate('organizations')
            .then((solution) => {
                if (!solution) throw 'Solution does not exist'

                req.solution = solution
                next()
            })
            .catch((err) => {
                return res.status(400).send({
                    message: err,
                })
            })
    }

    Solution.findById(id)
        .populate('user', 'displayName')
        .populate('issues')
        .populate('organizations')
        .exec(function (err, solution) {
            if (err) {
                return next(err)
            } else if (!solution) {
                return res.status(404).send({
                    message: 'No solution with that identifier has been found',
                })
            }
            req.solution = solution
            next()
        })
}

function filterSoftDeleteProposals(solutions, showDeleted) {
    if (showDeleted) return solutions

    if (showDeleted) return solutions

    return solutions.map((solution) => {
        solution.proposals = solution.proposals.filter((proposal) => {
            return proposal.softDeleted === false
        })

        return solution
    })
}

exports.seedData = function (organizationId, issueId) {
    const { seedData } = seed
    const newSolution = new Solution(seedData)
    newSolution.organizations = organizationId
    newSolution.issues = [issueId]
    newSolution.save()
    return newSolution
}

const isSlug = (objectId) => {
    if (objectId.match(/^[0-9a-fA-F]{24}$/)) {
        return false
    }

    return true
}
