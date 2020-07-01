'use strict'

/**
 * Module dependencies.
 */
let path = require('path'),
    mongoose = require('mongoose'),
    Notification = mongoose.model('Notification'),
    Issue = mongoose.model('Issue'),
    User = mongoose.model('User'),
    config = require(path.resolve('./config/config')),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    _ = require('lodash'),
    webPush = require('web-push')

const options = {
    vapidDetails: {
        subject: 'https://newvote.org',
        publicKey: config.vapid.VAPID_PUB,
        privateKey: config.vapid.VAPID_PRIV,
    },
    TTL: 60,
}

exports.create = function (req, res) {
    // Flag to inform whether the created notification is to be sent to all users who subscribe
    // to the notifications related issue
    const { isNotification } = req.query

    delete req.body._id
    let notification = new Notification(req.body)
    Issue.findById(notification.parent).then((issue) => {
        issue.notifications.push(notification._id)
        return issue.save()
    })

    notification
        .save()
        .then((item) => {
            return Notification.populate(item, [
                { path: 'parent', select: '_id name slug' },
                { path: 'user', select: '_id displayName firstName' },
                { path: 'rep' },
            ])
        })
        .then((data) => {
            // take the notification and send it to users
            if (isNotification === 'true') {
                sendPushNotification(data, req.organization, req.get('host'))
            }
            data.depopulate('parent')
            // depopulate parent field for client side notification list rendering
            return res.json(data)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.read = function (req, res) {
    Notification.findOne({ _id: req.body.id })
        .then((notification) => {
            res.json(notification)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.update = function (req, res) {
    let notification = req.notification
    _.extend(notification, req.body)

    notification
        .save()
        .then((savedNotification) => res.json(savedNotification))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.delete = function (req, res) {
    Notification.findOne({ _id: req.notification._id })
        .then((notification) => notification.remove())
        .then((notification) => res.json(notification))
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.list = function (req, res) {
    Notification.find()
        .populate('user', '_id displayName firstName')
        .populate('rep')
        .then((progresss) => {
            res.json(progresss)
        })
        .catch((err) => {
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.notificationByID = function (req, res, next, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            message: 'Notification is invalid',
        })
    }

    Notification.findById(id)
        .populate('user')
        .then((notification) => {
            if (!notification) {
                return res.status(404).send({
                    message:
                        'No Notification with that identifier has been found',
                })
            }
            req.notification = notification
            next()
        })
}

const sendPushNotification = (notification, organization, originUrl) => {
    const { url, _id } = organization
    const { description, parent } = notification

    const bodyText = stripHtml(description)

    const notificationPayload = {
        notification: {
            title: `Update: ${parent.name}`,
            body: `${bodyText}`,
            icon: 'assets/logo-no-text.png',
            badge: 'assets/logo-no-text.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1,
                organization: url,
                url: parent.slug || parent._id,
                originUrl: originUrl.includes('api.staging')
                    ? 'staging'
                    : 'production',
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Go to Issue',
                },
            ],
        },
    }

    // To find users to send notifications to we search
    // subscriptions for corresponding organization
    // AND
    // whether they have a subscription to the current issue
    const field = 'subscriptions.' + _id + '.issues'
    const field2 = 'subscriptions.' + _id + '.isSubscribed'
    // convert ObjectId to string as comparing with objectId fails, issues saved on subscriptions object
    // are saved as string
    const parentId = mongoose.Types.ObjectId(parent._id).toString()
    let query = {
        [field]: { $in: [parentId] },
    }

    return User.find(query)
        .and([
            {
                [field2]: true
            }
        ])
        .then((users) => {
            if (!users.length) throw 'No users to send notification to'

            // Converts user objects array to array of pushSubscription arrays
            return (
                users
                    .map((user) => {
                        return user.subscriptions[_id].pushSubscriptions
                    })
                    // flatten 2d array of push subscriptions
                    .reduce((prev, curr) => {
                        return prev.concat(curr)
                    }, [])
                    // iterate through array and send of notifications for each subscription
                    .forEach((subscription) => {
                        return webPush.sendNotification(
                            subscription,
                            JSON.stringify(notificationPayload),
                            options,
                        )
                    })
            )
        })
        .then((res) => {
            return true
        })
        .catch((err) => {
            return err
        })
}

function stripHtml(html) {
    // https://stackoverflow.com/a/5002161
    return html.replace(/(<([^>]+)>)/gi, '')
}
