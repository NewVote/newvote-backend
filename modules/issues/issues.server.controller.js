'use strict';

/**
 * Module dependencies.
 */
const path = require('path'),
    mongoose = require('mongoose'),
    Issue = mongoose.model('Issue'),
    IssuesController = require('./issues.server.controller'),
    votes = require('../votes/votes.server.controller'),
    Solution = mongoose.model('Solution'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash'),
    seed = require('./seed/seed'),
    createSlug = require('../helpers/stuff');

/**
 * Create a issue
 */
exports.create = function (req, res) {
    // if the string is empty revert to default on model
    if (!req.body.imageUrl) {
        delete req.body.imageUrl;
    }

    let issue = new Issue(req.body);
    issue.user = req.user;
    issue.slug = createSlug(issue.name);
    issue.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(issue);
        }
    });
};

/**
 * Show the current issue
 */
exports.read = function (req, res) {
    // ;
    IssuesController.attachMetaData([req.issue], req.user)
        .then(function (issueArr) {
            const updatedIssue = issueArr[0];
            res.json(updatedIssue);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Update a issue
 */
exports.update = function (req, res) {
    // __v causes version conflicts during tests, so remove from client side request
    delete req.body.__v;
    let issue = req.issue;
    _.extend(issue, req.body);
    // issue.title = req.body.title;
    // issue.content = req.body.content;

    issue
        .save()
        .then(savedIssue => res.json(savedIssue))
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Delete an issue
 */
exports.delete = function (req, res) {
    let issue = req.issue;

    issue.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(issue);
        }
    });
};

/**
 * List of Issues
 */
exports.list = function (req, res) {
    let query = {};
    let topicId = req.query.topicId || null;
    let org = req.organization;
    let orgUrl = org ? org.url : null;
    let search = req.query.search || null;
    let showDeleted = req.query.showDeleted || null;

    let orgMatch = orgUrl ? {
        'organizations.url': orgUrl
    } : {};
    let topicMatch = topicId ? {
        topics: mongoose.Types.ObjectId(topicId)
    } : {};
    let searchMatch = search ? {
        $text: {
            $search: search
        }
    } : {};

    let showNonDeletedItemsMatch = {
        $or: [{
            softDeleted: false
        }, {
            softDeleted: {
                $exists: false
            }
        }]
    };
    let showAllItemsMatch = {};
    let softDeleteMatch = showDeleted ?
        showAllItemsMatch :
        showNonDeletedItemsMatch;

    Issue.aggregate([{
        $match: searchMatch
    },
    {
        $match: softDeleteMatch
    },
    {
        $match: topicMatch
    },
    {
        $lookup: {
            from: 'organizations',
            localField: 'organizations',
            foreignField: '_id',
            as: 'organizations'
        }
    },
    {
        $match: orgMatch
    },
    {
        $unwind: '$organizations'
    },
    {
        $lookup: {
            from: 'topics',
            localField: 'topics',
            foreignField: '_id',
            as: 'topics'
        }
    },
    {
        $sort: {
            name: 1
        }
    }
    ]).exec(function (err, issues) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            IssuesController.attachMetaData(issues, req.user)
                .then(function (issues) {
                    res.json(issues);
                })
                .catch(function (err) {
                    res.status(500).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                });
        }
    });
};

/**
 * Issue middleware
 */
exports.issueByID = function (req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return Issue.findOne({
            slug: id
        })
            .populate('user', 'displayName')
            .populate('topics', 'name')
            .populate('organizations')
            .then((issue) => {
                if (!issue) throw ('Issue does not exist');

                req.issue = issue;
                next();
            })
            .catch((err) => {
                return res.status(400).send({
                    message: err
                });
            })
    }

    Issue.findById(id)
        .populate('user', 'displayName')
        .populate('topics', 'name')
        .populate('organizations')
        .exec(function (err, issue) {
            if (err) {
                return next(err);
            } else if (!issue) {
                return res.status(404).send({
                    message: 'No issue with that identifier has been found'
                });
            }
            req.issue = issue;
            next();
        });
};

exports.attachMetaData = function (issues, user) {
    if (!issues) return Promise.resolve(issues);

    let issueIds = issues.map(function (issue) {
        return issue._id;
    });

    return Solution.find({
        issues: {
            $in: issueIds
        }
    })
        .sort('-created')
        .exec()
        .then(function (solutions) {
            return votes.attachVotes(solutions, user).then(function (solutions) {
                issues = issues.map(function (issue) {
                    let up = 0,
                        down = 0,
                        total = 0,
                        solutionCount = 0,
                        totalTrendingScore = 0,
                        lastCreated = issue.created;

                    //looping through each issue passed in to exported method

                    solutions.forEach(function (solution) {
                        //loop through each solution found in the db

                        //must check that this solution belongs to the current issue being tested
                        if (
                            solution.issues.indexOf(issue._id.toString()) !== -1
                        ) {
                            //found issue id inside solution issues array
                            let currentDate = new Date(lastCreated);
                            let date = new Date(solution.created);
                            let nowDate = new Date();
                            let age =
                                (nowDate.getTime() - date.getTime()) /
                                (1000 * 60 * 60);

                            up += solution.votes.up;
                            down += solution.votes.down;
                            total += solution.votes.total;
                            solutionCount++;
                            totalTrendingScore += solution.votes.up / age;
                            lastCreated =
                                date > lastCreated ? date : lastCreated;
                        }
                    });

                    issue.solutionMetaData = {
                        votes: {
                            up: up,
                            down: down,
                            total: total
                        },
                        solutionCount: solutionCount,
                        totalTrendingScore: totalTrendingScore,
                        lastCreated: lastCreated
                    };

                    return issue;
                });
                return issues;
            });
        });
};

exports.seedData = function (organizationId, topicId) {
    const {
        seedData
    } = seed;
    const newIssue = new Issue(seedData);
    newIssue.organizations = organizationId;
    newIssue.topics = [topicId];
    newIssue.save();
    return newIssue;
};
