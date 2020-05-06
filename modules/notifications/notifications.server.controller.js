'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Notification = mongoose.model('Notification'),
    Issue = mongoose.model('Issue'),
    User = mongoose.model('User'),
    config = require(path.resolve('./config/config')),
    errorHandler = require(
        path.resolve(
            './modules/core/errors.server.controller'
        )
    ),
    _ = require('lodash'),
    webPush = require('web-push');

const options = {
    vapidDetails: {
        subject: 'https://newvote.org',
        publicKey: config.vapid.VAPID_PUB,
        privateKey: config.vapid.VAPID_PRIV
    },
    TTL: 60
}
    
    
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
            return Notification
                .populate(item, [{ path: 'user', select: '_id displayName firstName' }, { path: 'rep' }])
        })
        .then((data) => {
            // take the notification and send it to users
            sendPushNotification(data, req.organization)
            // return data to client
            return res.json(data);
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
        .populate('rep')
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

const sendPushNotification = (notification, organization) => {
    const { url } = organization
    const { description } = notification

    const notificationPayload = {
        "notification": {
            "title": `${organization.name} Issue Update`,
            "body": `${description}`,
            "vibrate": [100, 50, 100],
            "data": {
                "dateOfArrival": Date.now(),
                "primaryKey": 1
            },
            "actions": [{
                "action": "explore",
                "title": "Go to Issue"
            }]
        }
    };
    
    // We search the subscription object by matching the organization url
    // to the subscription object property keys

    // const organizationUrl = organization.url
    // const value = { $exists: true }
    const field = 'subscriptions.' + organization.url
    const value = { $exists: true }
    let query = {
        [field]: value
    };
    // query.subscriptions[organizationUrl] = value

    return User.find(query)
        .then((users) => {
            if (!users.length) throw('No users to send notification to')

            return users.forEach((user) => {
                console.log(user, 'this is user')
                const subscription = user.subscriptions[organization.url]
                return webPush.sendNotification(subscription, JSON.stringify(notificationPayload), options)
            })
        })
        .then((res) => {
            console.log(res, 'this is res')
            return true
        })
        .catch((err) => {
            console.log(err, 'this is err')
            return err;
        })
}