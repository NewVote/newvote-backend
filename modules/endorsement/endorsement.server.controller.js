'use strict'

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Endorsement = mongoose.model('Endorsement'),
    votes = require('../votes/votes.server.controller'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    _ = require('lodash'),
    scrape = require('html-metadata')

/**
 * Create a endorsement
 */
exports.create = function (req, res) {
    let endorsement = new Endorsement(req.body)
    endorsement.user = req.user
    endorsement.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        } else {
            res.json(endorsement)
        }
    })
}

/**
 * Show the current endorsement
 */
exports.read = function (req, res) {
    res.json(req.endorsement)
}

/**
 * Update a endorsement
 */
exports.update = function (req, res) {
    let endorsement = req.endorsement
    _.extend(endorsement, req.body)

    endorsement.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        } else {
            res.json(endorsement)
        }
    })
}

/**
 * Delete an endorsement
 */
exports.delete = function (req, res) {
    let endorsement = req.endorsement

    endorsement.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        } else {
            res.json(endorsement)
        }
    })
}

/**
 * List of endorsements
 */
exports.list = function (req, res) {
    let solutionId = req.query.solutionId,
        issueId = req.query.issueId,
        proposalId = req.query.proposalId,
        searchParams = req.query.search,
        endorsementId = req.query.endorsementId,
        query

    if (solutionId) {
        query = {
            solutions: solutionId,
        }
    } else if (issueId) {
        query = {
            issues: issueId,
        }
    } else if (proposalId) {
        query = {
            proposals: proposalId,
        }
    } else {
        query = null
    }
    Endorsement.find(query)
        .sort('-created')
        .populate('user', 'displayName')
        .populate('issues')
        .populate('solutions')
        .exec(function (err, endorsements) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err),
                })
            } else {
                votes
                    .attachVotes(endorsements, req.user)
                    .then(function (endorsementArr) {
                        // console.log(endorsementArr);
                        res.json(endorsementArr)
                    })
                    .catch(function (err) {
                        res.status(500).send({
                            message: errorHandler.getErrorMessage(err),
                        })
                    })
            }
        })
}

/**
 * endorsement middleware
 */
exports.endorsementByID = function (req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Endorsement is invalid',
        })
    }

    Endorsement.findById(id)
        .populate('user', 'displayName')
        .populate('issues')
        .populate('solutions')
        .exec(function (err, endorsement) {
            if (err) {
                return next(err)
            } else if (!endorsement) {
                return res.status(404).send({
                    message:
                        'No endorsement with that identifier has been found',
                })
            }
            votes
                .attachVotes([endorsement], req.user)
                .then(function (endorsementArr) {
                    req.endorsement = endorsementArr[0]
                    next()
                })
                .catch(next)
        })
}
