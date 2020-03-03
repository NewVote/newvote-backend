'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Progress = mongoose.model('Progress'),
    issueController = require('../issues/issues.server.controller'),
    errorHandler = require(
        path.resolve(
            './modules/core/errors.server.controller'
        )
    ),
    _ = require('lodash');


exports.createProgress = function (issue) {
    const progress = new Progress();
    progress.states = [
        {
            name: 'Raised',
            active: true
        },
        {
            name: 'In Progress',
            active: false
        },
        {
            name: 'Outcome',
            active: false
        },
    ]
    progress.parentType = 'Issue';
    progress.parent = issue._id

    return progress.save()
}
    
exports.create = function (req, res) {
    console.log(req.body, 'this is req.body')
    let progress = new Progress(req.body);
    console.log(progress, 'this is progress')
    progress.save()
        .then(() => {
            res.json(progress);
        })
        .catch((err) => {
            console.log(err, 'this is err')
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}
    
exports.read = function (req, res) {
    Progress.findOne({ _id: req.body.id })
        .then((progress) => {
            res.json(progress);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.update = function (req, res) {
    let progress = req.progress;
    _.extend(progress, req.body);

    progress.save()
        .then((savedProgress) => res.json(savedProgress))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            })
        });
}

exports.delete = function (req, res) {
    Progress.findById(req.body.id)
        .remove()
        .then((progress) => {
            return res.json(progress);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.list = function (req, res) {
    Progress.find()
        .then((progresss) => {
            res.json(progresss);
        })
        .catch((err) => {
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.progressByID = function(req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Progress is invalid'
        });
    }

    Progress.findById(id)
        .then((progress) => {
            if (!progress) {
                return res.status(404).send({
                    message: 'No Progress with that identifier has been found'
                });
            }
            req.progress = progress;
            next();
        })
};