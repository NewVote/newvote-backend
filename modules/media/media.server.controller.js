'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Media = mongoose.model('Media'),
    votes = require('../votes/votes.server.controller'),
    errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
    _ = require('lodash'),
    scrape = require('html-metadata');

/**
 * Create a media
 */
exports.create = function (req, res) {
    let media = new Media(req.body);
    media.user = req.user;
    media.save()
        .then((media) => {
            return votes.attachVotes([media], req.user)
        })
        .then((mediaArr) => {
            return res.json(mediaArr[0]);
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                });
        });
};

/**
 * Show the current media
 */
exports.read = function (req, res) {
    votes.attachVotes([req.media], req.user)
        .then(function (mediaArr) {
            const updatedMedia = mediaArr[0];
            res.json(req.media);
        })
        .catch(err => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                });
        });
};

/**
 * Update a media
 */
exports.update = function (req, res) {
    // client side media with attached vote object clashes with server version of media
    // remove current User or save will fail
    delete req.body.votes.currentUser;

    let media = req.media;
    _.extend(media, req.body);

    media.save()
        .then((doc) => {
            return votes.attachVotes([doc], req.user)
        })
        .then((media) => {
            return res.json(media[0]);
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                });
        })
};

/**
 * Delete an media
 */
exports.delete = function (req, res) {
    let media = req.media;

    media.remove(function (err) {
        if (err) {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                });
        } else {
            res.json(media);
        }
    });
};

/**
 * List of Medias
 */

exports.list = function (req, res) {
    let { orgs = '' } = req.query
    // orgs is a string with a list of organization urls, separated by commas
    // split it and search to get all related issues
    if (orgs) {
        orgs = orgs.split(',')
    }

    let issueId = req.query.issueId || null;
    let solutionId = req.query.solutionId || null;
    let proposalId = req.query.proposalId || null;
    let search = req.query.search || null;
    let showDeleted = req.query.showDeleted || null;

    let orgMatch = !orgs.length ? {} :
        {
            'organizations.url': {
                $in: orgs
            }
        } 

    let entityKeys = ['issues', 'solutions', 'proposals'];
    let entity;
    let entityKey;

    if (issueId) {
        entityKey = entityKeys[0]
        entity = issueId;
    }

    if (solutionId) {
        entityKey = entityKeys[1];
        entity = solutionId
    }

    if (proposalId) {
        entityKey = entityKeys[2];
        entity = proposalId;
    }

    let entityMatch = entityKey ? {
        [entityKey]: mongoose.Types.ObjectId(entity)
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


    Media.aggregate([{
        $match: searchMatch
    },
    {
        $match: softDeleteMatch
    },
    {
        $match: entityMatch
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
    // {
    //     $lookup: {
    //         from: entityKey,
    //         localField: entityKey,
    //         foreignField: '_id',
    //         as: entityKey
    //     }
    // },
    {
        $sort: {
            created: -1
        }
    }
    ])
        .exec(function (err, medias) {
            if (err) {
                return res.status(400)
                    .send({
                        message: errorHandler.getErrorMessage(err)
                    });
            } else {
                return votes.attachVotes(medias, req.user)
                    .then(function (mediaArr) {
                        res.json(mediaArr);
                    })
                    .catch(function (err) {
                        res.status(500)
                            .send({
                                message: errorHandler.getErrorMessage(err)
                            });
                    });
            }
        });
};

/**
 * Media middleware
 */
exports.mediaByID = function (req, res, next, id) {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400)
            .send({
                message: 'Media is invalid'
            });
    }

    Media.findById(id)
        .populate('user', 'displayName')
        .populate('issues')
        .populate('solutions')
        .populate('proposals')
        .populate('organizations')
        .exec(function (err, media) {
            if (err) {
                return next(err);
            } else if (!media) {
                return res.status(404)
                    .send({
                        message: 'No media with that identifier has been found'
                    });
            }
            req.media = media;
            next();
        });
};

exports.getMeta = function (req, res) {
    let url = req.params.uri;
    return scrape(url)
        .then(function (meta) {
            let media = {};
            let title, description, image;
            if (meta.dublinCore && meta.dublinCore.title) {
                title = meta.openGraph.title;
            } else if (meta.dublinCore && meta.openGraph.title) {
                title = meta.openGraph.title;
            } else if (meta.general && meta.general.title) {
                title = meta.general.title;
            }

            if (meta.dublinCore && meta.dublinCore.description) {
                description = meta.dublinCore.description;
            } else if (meta.openGraph && meta.openGraph.description) {
                description = meta.openGraph.description;
            } else if (meta.general && meta.general.description) {
                description = meta.general.description;
            }

            if (meta.openGraph && meta.openGraph.image) {
                image = meta.openGraph.image.url;
            } else if (meta.twitter && meta.twitter.description) {
                image = meta.twitter.image;
            }

            media.title = title ? title : null;
            media.description = description ? description : null;
            media.image = image ? image : null;
            media.url = url;

            return res.json(media);
        }, function (error) {
            console.log('Error scraping: ', error.message);
            return res.status(400)
                .send({
                    message: 'No metadata found.'
                });
        });
};
