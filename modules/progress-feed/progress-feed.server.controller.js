'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Feed = mongoose.model('Feed')
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash');

exports.create = function (req, res) {
    let feed = new Feed(req.body);
    feed.save()
        .then(() => {
            res.json(feed);
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.read = function (req, res) {
    Feed.findOne({ _id: req.body.id })
        .then((feed) => {
            res.json(feed);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.update = function (req, res) {

    let feed = req.feed;
    _.extend(feed, req.body);

    feed.save()
        .then((savedIssue) => res.json(savedIssue))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            })
        }

}

exports.delete = function (req, res) {
    Feed.findById(req.body.id)
        .remove()
        .then((feed) => {
            return res.json(feed);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.list = function (req, res) {
    Feed.find()
        .then((feeds) => {
            res.json(feeds);
        })
        .catch((err) => {
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.feedByID = function(req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Feed is invalid'
        });
    }

    Feed.findById(id)
        .then((feed) => {
            if (!feed) {
                return res.status(404).send({
                    message: 'No issue with that identifier has been found'
                });
            }
            req.feed = feed;
            next();
        })
};