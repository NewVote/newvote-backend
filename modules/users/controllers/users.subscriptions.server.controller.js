'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    webPush = require('web-push');


// Track and update the push notification subscriptions of each user

const payload = "Payloadddddd"

const options = {
    vapidDetails: {
        subject: 'https://newvote.org',
        publicKey: config.vapid.VAPID_PUB,
        privateKey: config.vapid.VAPID_PRIV
    },
    TTL: 60
}

exports.create = (req, res) => {
    console.log(req.params)
    // console.log(req.body, 'this is req.body')
    // console.log(req.user, 'this is user')
    const { subscriptionId: id } = req.params
    // const { _id: id } = req.user
    const { subscription } = req.body

    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw('User does not exist')

            if (!user.subscriptions) {
                user.subscriptions = {
                }
            }

            user.subscriptions = Object.assign(user.subscriptions, {
                [req.organization.url]: subscription
            })

            return user.save()
        })
        .then((user) => {
            return res.json(user);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.update = (req, res) => {
    const { _id: id } = req.user
    const { subscription } = req.body

    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw('User does not exist')
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.delete = (req, res) => {
    const { _id: id } = req.user
    const { subscription } = req.body

    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw('User does not exist')
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.test = (req, res) => {
    console.log(req.organization, 'this is req.org')
    console.log(req.params, 'this is params')
    const { subscriptionId: id } = req.params

    const notificationPayload = {
        "notification": {
            "title": "Angular News",
            "body": "Newsletter Available!",
            "vibrate": [100, 50, 100],
            "data": {
                "dateOfArrival": Date.now(),
                "primaryKey": 1
            },
            "actions": [{
                "action": "explore",
                "title": "Go to the site"
            }]
        }
    };

    User.findOne({ _id: id })
        .then((user) => {
            console.log(user, 'this is user')
            if (!user.subscriptions[req.organization.url]) throw('User is not subscribed to organization')
            console.log(user, 'this is user')
            const subscription = user.subscriptions[req.organization.url]
            return webPush.sendNotification(subscription, JSON.stringify(notificationPayload), options)
        })
        .then((data) => {
            console.log(data, 'this is data')
            return res.json({ found: data })
        })
        .catch((err) => {
            console.log(err, 'this is err')
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });    
        })
}
