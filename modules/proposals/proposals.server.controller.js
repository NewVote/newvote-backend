'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Proposal = mongoose.model('Proposal'),
    Vote = mongoose.model('Vote'),
    votes = require('../votes/votes.server.controller'),
    Solution = mongoose.model('Solution'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash');

/**
 * Create a proposal
 */
exports.create = function(req, res) {
    // if the string is empty revert to default on model
    if (!req.body.imageUrl) {
        delete req.body.imageUrl;
    }

    const proposalPromise = new Promise((resolve, reject) => {
        let proposal = new Proposal(req.body);
        proposal.user = req.user;
        resolve(proposal);
    });

    // Return votes without an _id - as it cannot be deleted
    // _id being preset prevents copying and saving of vote data between collections
    const votePromise = Vote.find({
        object: req.body.suggestion._id,
        objectType: 'Suggestion'
    }).select('-_id -created');

    Promise.all([proposalPromise, votePromise])
        .then(promises => {
            const [proposal, votes] = promises;

            if (!proposal) throw 'Proposal failed to save';

            if (votes) {
                const convertSuggestionVotesToProposal = votes.map(vote => {
                    let newVote = new Vote(vote);
                    newVote.objectType = 'Proposal';
                    newVote.object = proposal._id;
                    return newVote;
                });

                Vote.insertMany(convertSuggestionVotesToProposal);
            }

            return proposal.save();
        })
        .then(proposal => {
            return res.json(proposal);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Show the current proposal
 */
exports.read = function(req, res) {
    votes
        .attachVotes([req.proposal], req.user, req.query.regions)
        .then(function(proposalArr) {
            const updatedProposal = proposalArr[0];
            res.json(updatedProposal);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Update a proposal
 */
exports.update = function(req, res) {
    delete req.body.__v;
    let proposal = req.proposal;
    _.extend(proposal, req.body);
    // proposal.title = req.body.title;
    // proposal.content = req.body.content;
    proposal.user = req.user;
    proposal.save(function(err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(proposal);
        }
    });
};

/**
 * Delete an proposal
 */
exports.delete = function(req, res) {
    let proposal = req.proposal;

    Vote.deleteMany({ object: req.proposal._id, objectType: 'Proposal' })
        .then(votes => {
            return proposal.remove();
        })
        .then(proposal => {
            return res.json(proposal);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * List of Proposals
 */
exports.list = function(req, res) {
    let solutionId = req.query.solutionId || null;
    let search = req.query.search || null;
    let org = req.organization;
    let orgUrl = org ? org.url : null;
    let showDeleted = req.query.showDeleted || null;

    let orgMatch = orgUrl ? { 'organizations.url': orgUrl } : {};
    let solutionMatch = solutionId
        ? { solutions: mongoose.Types.ObjectId(solutionId) }
        : {};
    let searchMatch = search ? { $text: { $search: search } } : {};

    let showNonDeletedItemsMatch = {
        $or: [{ softDeleted: false }, { softDeleted: { $exists: false } }]
    };
    let showAllItemsMatch = {};
    let softDeleteMatch = showDeleted
        ? showAllItemsMatch
        : showNonDeletedItemsMatch;

    Proposal.aggregate([
        { $match: searchMatch },
        { $match: softDeleteMatch },
        { $match: solutionMatch },
        {
            $lookup: {
                from: 'organizations',
                localField: 'organizations',
                foreignField: '_id',
                as: 'organizations'
            }
        },
        {
            $lookup: {
                from: 'solutions',
                localField: 'solutions',
                foreignField: '_id',
                as: 'solutions'
            }
        },
        { $match: orgMatch },
        { $unwind: '$organizations' },
        { $sort: { created: -1 } }
    ]).exec(function(err, proposals) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            votes
                .attachVotes(proposals, req.user, req.query.regions)
                .then(function(proposals) {
                    res.json(proposals);
                })
                .catch(function(err) {
                    res.status(500).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                });
        }
    });
};

/**
 * Proposal middleware
 */
exports.proposalByID = function(req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Proposal is invalid'
        });
    }

    Proposal.findById(id)
        .populate('user', 'displayName')
        .populate('solutions')
        .populate('solution')
        .populate('organizations')
        .exec(function(err, proposal) {
            if (err) {
                return next(err);
            } else if (!proposal) {
                return res.status(404).send({
                    message: 'No proposal with that identifier has been found'
                });
            }
            req.proposal = proposal;
            next();
        });
};

exports.attachProposals = function(objects, user, regions) {
    // ;
    const promises = objects.map(obj => {
        return Proposal.find({ solutions: obj._id })
            .populate('solutions')
            .then(props => {
                return votes.attachVotes(props, user, regions).then(props => {
                    obj.proposals = props;
                    return obj;
                });
            });
    });
    return Promise.all(promises);
};

function updateSchema(proposals) {
    console.log('schema update called');
    for (let i = 0; i < proposals.length; i++) {
        let proposal = proposals[i];
        console.log('testing: ', proposal.title);
        if (proposal.goals && proposal.goals.length > 0) {
            proposal.solutions = proposal.goals;
            // proposal.goal = undefined;
            proposal.goals = undefined;
            delete proposal.goals;

            console.log('updated: ', proposal.title);
            proposal.save().then(() => console.log('saved proposal'));
        }
    }
}
