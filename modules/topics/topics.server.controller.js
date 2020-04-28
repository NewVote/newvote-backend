'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Topic = mongoose.model('Topic'),
    TopicsController = require('./topics.server.controller'),
    votes = require('../votes/votes.server.controller'),
    Solution = mongoose.model('Solution'),
    errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
    _ = require('lodash'),
    seed = require('./seed/seed'),
    createSlug = require('../helpers/slug')

/**
 * Create a topic
 */
exports.create = function (req, res) {

    Topic.generateUniqueSlug(req.body.name, null, function (slug) {
        let topic = new Topic(req.body);
        topic.user = req.user;
        topic.slug = slug;

        topic.save(function (err) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err)
                });
            } else {
                res.json(topic);
            }
        });
    })

};

/**
 * Show the current topic
 */
exports.read = function (req, res) {
    res.json(req.topic);
};

/**
 * Update a topic
 */
exports.update = function (req, res) {
    let topic = req.topic;
    _.extend(topic, req.body);
    // topic.title = req.body.title;
    // topic.content = req.body.content;

    if (!topic.slug || createSlug(topic.name) !== topic.slug) {
        return Topic.generateUniqueSlug(topic.name, null, function (slug) {
            topic.slug = slug

            topic.save(function (err) {
                if (err) {
                    return res.status(400).send({
                        message: errorHandler.getErrorMessage(err)
                    });
                } else {
                    res.json(topic);
                }
            });
        })
    }

    topic.save(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(topic);
        }
    });
};

/**
 * Delete an topic
 */
exports.delete = function (req, res) {
    let topic = req.topic;

    topic.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(topic);
        }
    });
};

/**
 * List of Topics
 */
exports.list = function (req, res) {
    let query = {};
    let org = req.organization;
    let orgUrl = org ? org.url : null;
    let search = req.query.search || null;
    let showDeleted = req.query.showDeleted || null;

    let orgMatch = orgUrl ? {
        'organizations.url': orgUrl
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

    Topic.aggregate([{
        $match: searchMatch
    },
    {
        $match: softDeleteMatch
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
        $unwind: '$organizations'
    },
    {
        $match: orgMatch
    },
    {
        $sort: {
            name: 1
        }
    }
    ]).exec(function (err, topics) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(topics);
        }
    });
};

/**
 * Topic middleware
 */
exports.topicByID = function (req, res, next, id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return Topic.findOne({
            slug: id
        })
            .populate('user', 'displayName')
            .populate('organizations')
            .then((topic) => {
                if (!topic) throw ('Topic does not exist');

                req.topic = topic;
                next();
            })
            .catch((err) => {
                return res.status(400).send({
                    message: err
                });
            })
    }

    return Topic.findById(id)
        .populate('user', 'displayName')
        .populate('organizations')
        .exec(function (err, topic) {
            if (err) {
                return next(err);
            } else if (!topic) {
                return res.status(404).send({
                    message: 'No topic with that identifier has been found'
                });
            }
            req.topic = topic;
            next();
        });
};

exports.seedTopic = function (organizationId) {
    const {
        seedData
    } = seed;
    const newTopic = new Topic(seedData);
    newTopic.organizations = organizationId;
    newTopic.save();
    return newTopic;
}
