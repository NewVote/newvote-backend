'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    config = require(path.resolve('./config/config')),
    Suggestion = mongoose.model('Suggestion'),
    Organization = mongoose.model('Organization'),
    Issue = mongoose.model('Issue'),
    Solution = mongoose.model('Solution'),
    Proposal = mongoose.model('Proposal'),
    Vote = mongoose.model('Vote'),
    voteController = require('../votes/votes.server.controller'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    nodemailer = require('nodemailer'),
    transporter = nodemailer.createTransport(config.mailer.options),
    _ = require('lodash'),
    seed = require('./seed/seed');

// TODO: Use a server side templating language to use a html file for this
let buildMessage = function (suggestion, req) {
    let messageString = '';
    let url = req.protocol + '://' + req.get('host');
    if (!suggestion.parent) {
        messageString += '<h2> This is a new suggestion' + '</h2>';
        messageString += '<h3>Title: ' + suggestion.title + '</h3>';
    } else {
        messageString += '<h2> This is an edit for:' + '</h2>';
        messageString +=
            `<h3>Title: <a href='${url}/${suggestion.parentType.toLowerCase()}s/${
                suggestion.parent._id
            }'>` +
            suggestion.title +
            '</a></h3>';
    }

    messageString +=
        '<p>User: ' +
        suggestion.user.firstName +
        ' ' +
        suggestion.user.lastName +
        '(' +
        suggestion.user.email +
        ')</p>';
    messageString += '<h3>Summary: </h3>';
    messageString += '<p>' + suggestion.description + '</p>';
    messageString += '<h3>Starting Statements: </h3>';
    messageString += '<p>' + suggestion.statements + '</p>';
    messageString += '<h3>3rd Party Media: </h3>';
    messageString += '<p>' + suggestion.media + '</p>';

    return messageString;
};

/**
 * Create a suggestion
 */
exports.create = function (req, res) {
    let suggestion = new Suggestion(req.body);

    if (!suggestion.parent) {
        suggestion.parent = null;
    }

    suggestion.user = req.user;
    suggestion.save(err => {
        if (err) throw err;
    });

    const getSuggestion = Suggestion.populate(suggestion, {
        path: 'user organizations'
    });

    const getOrganization = getSuggestion.then(suggestion => {
        // if organization has no owner then begin exit out of promise chain
        if (!suggestion.organizations || !suggestion.organizations.owner)
            return false;
        return Organization.populate(suggestion.organizations, {
            path: 'owner'
        });
    });

    return Promise.all([getSuggestion, getOrganization])
        .then(promises => {
            const [suggestionPromise, orgPromise] = promises;
            if (!orgPromise || !suggestionPromise) return false;

            return transporter.sendMail({
                from: process.env.MAILER_FROM,
                to: orgPromise.owner.email,
                subject: 'New suggestion created on your NewVote community!',
                html: buildMessage(suggestion, req)
            },
            (err, info) => {
                return false;
            }
            );
        })
        .then(() => {
            // a new suggestion is returned without a vote object - breaks vote button component
            return voteController.attachVotes([suggestion], req.user, req.query.regions)
        })
        .then((suggestions) => {
            // console.log('mailer success: ', data);
            return res.status(200).json(suggestions[0]);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Show the current suggestion
 */
exports.read = function (req, res) {
    voteController
        .attachVotes([req.suggestion], req.user, req.query.regions)
        .then(function (suggestionArr) {
            const updatedSuggestion = suggestionArr[0];
            res.json(updatedSuggestion);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Update a suggestion
 */
exports.update = function (req, res) {

    // Client updates the vote object directly on store
    // If sent to the backend the votes object on suggestion will not save voteValue
    // in order to match data on client / backend - we remove the votes object & have the backend
    // reAttach votes
    if (req.body.votes) {
        delete req.body.votes;
    }

    let suggestion = req.suggestion;
    _.extend(suggestion, req.body);

    // suggestion.title = req.body.title;
    // suggestion.content = req.body.content;
    suggestion.save()
        .then((res) => {
            return voteController
                .attachVotes([res], req.user, req.query.regions)
        })
        .then((data) => {
            res.json(data[0]);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
};

/**
 * Delete an suggestion
 */
exports.delete = function (req, res) {
    let suggestion = req.suggestion;

    Vote.deleteMany({
        object: req.suggestion._id,
        objectType: 'Suggestion'
    })
        .then(votes => {
            return suggestion.remove();
        })
        .then(suggestion => {
            return res.json(suggestion);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * List of Suggestions
 */
exports.list = function (req, res) {
    let search = req.query.search || null;
    let org = req.organization;
    let orgUrl = org ? org.url : null;
    let showDeleted = req.query.showDeleted || null;
    let type = req.query.type || null;
    let parent = req.query.parent || null;
    let user = req.query.user || null;

    if (parent) {
        parent = mongoose.Types.ObjectId(parent);
    }

    if (user) {
        user = mongoose.Types.ObjectId(user);
    }

    let orgMatch = orgUrl ? {
        'organizations.url': orgUrl
    } : {};
    let searchMatch = search ? {
        $text: {
            $search: search
        }
    } : {};
    let typeMatch = type ? {
        type: type
    } : {};
    let parentMatch = parent ? {
        parent: parent
    } : {};
    let userMatch = user ? {
        user: user
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

    Suggestion.aggregate([{
        $match: searchMatch
    },
    {
        $match: softDeleteMatch
    },
    {
        $match: typeMatch
    },
    {
        $match: parentMatch
    },
    {
        $match: userMatch
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
        $sort: {
            created: -1
        }
    }
    ]).exec(function (err, suggestions) {
        if (err) throw err;
        voteController
            .attachVotes(suggestions, req.user, req.query.regions)
            .then(suggestions => res.json(suggestions))
            .catch(err => {
                throw err;
            });
    });
};

/**
 * Suggestion middleware
 */
exports.suggestionByID = function (req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Suggestion is invalid'
        });
    }

    Suggestion.findById(id)
        .populate('user', 'displayName')
        .populate('organizations')
        .exec(function (err, suggestion) {
            if (err) {
                return next(err);
            } else if (!suggestion) {
                return res.status(404).send({
                    message: 'No suggestion with that identifier has been found'
                });
            }
            req.suggestion = suggestion;
            next();
        });
};

exports.seedData = function (organizationId) {
    const {
        seedData
    } = seed;
    const newSuggestion = new Suggestion(seedData);
    newSuggestion.organizations = organizationId;
    newSuggestion.save();
    return newSuggestion;
};
