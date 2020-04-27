'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Notification = mongoose.model('Notification'),
    Issue = mongoose.model('Issue'),
    errorHandler = require(
        path.resolve(
            './modules/core/errors.server.controller'
        )
    ),
    _ = require('lodash');
    
exports.create = function (req, res) {
    delete req.body._id
    let notification = new Notification(req.body);
    
    Issue.findById(notification.parent)
        .then((issue) => {
            issue.notifications.push(notification._id)
            return issue.save();
        })

    
    notification.save()
        .then((item) => {
            return Notification.populate(item, { path: 'user', select: '_id displayName firstName' })
        })
        .then((data) => {
            res.json(data);
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}
    
exports.read = function (req, res) {
    Notification.findOne({ _id: req.body.id })
        .then((notification) => {
            res.json(notification);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.update = function (req, res) {
    let notification = req.notification;
    _.extend(notification, req.body);

    notification.save()
        .then((savedNotification) => res.json(savedNotification))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            })
        });
}

exports.delete = function (req, res) {
    Notification.findOne({ _id: req.notification._id })
        .then((notification) => notification.remove())
        .then((notification) => res.json(notification))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.list = function (req, res) {
    Notification.find()
        .populate('user', '_id displayName firstName')
        .then((progresss) => {
            res.json(progresss);
        })
        .catch((err) => {
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.notificationByID = function(req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Notification is invalid'
        });
    }

    Notification.findById(id)
        .populate('user')
        .then((notification) => {
            if (!notification) {
                return res.status(404).send({
                    message: 'No Notification with that identifier has been found'
                });
            }
            req.notification = notification;
            next();
        })
};