'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Notification = mongoose.model('Notification'),
    issueController = require('../issues/issues.server.controller'),
    errorHandler = require(
        path.resolve(
            './modules/core/errors.server.controller'
        )
    ),
    _ = require('lodash');


// exports.createProgress = function (issue) {
//     const progress = new Progress();
//     progress.states = [
//         {
//             name: 'Raised',
//             active: true
//         },
//         {
//             name: 'In Progress',
//             active: false
//         },
//         {
//             name: 'Outcome',
//             active: false
//         },
//     ]
//     progress.parentType = 'Issue';
//     progress.parent = issue._id

//     return progress.save()
//         .then((res) => {
//             console.log(res)
//             return res
//         })
// }
    
exports.create = function (req, res) {
    delete req.body._id
    let notification = new Notification(req.body);
    issueController.findById(notification.parent)
        .then((issue) => {
            issue.notification.push(notification._id)
            return issue.save();
        })

    notification.save()
        .then(() => {
            res.json(notification);
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
    Notification.findById(req.body.id)
        .remove()
        .then((notification) => {
            return res.json(notification);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.list = function (req, res) {
    Notification.find()
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