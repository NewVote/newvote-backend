'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Progress = mongoose.model('Progress'),
    errorHandler = require(
        path.resolve(
            './modules/core/errors.server.controller'
        )
    ),
    _ = require('lodash');
    
    exports.create = function (req, res) {
        let progress = new Progress(req.body);
        progress.save()
            .then(() => {
                res.json(progress);
            })
            .catch((err) => {
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