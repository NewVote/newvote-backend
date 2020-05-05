'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    config = require(path.resolve('./config/config')),
    path = require('path'),
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
    const { _id: id } = req.user
    const { subscription } = req.body

    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw('User does not exist')

            if (!user.subscriptions) {
                user.subscriptions = {
                    [req.organization.url]: subscription
                }
            }

            if (!user.subscriptions[req.organization.url]) {
                user.subscriptions = {
                    [req.organization.url]: subscription
                }
            }

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
    const { _id } = req

    User.findOne({ _id })
        .then((user) => {
            if (!req.organization.subscriptions[req.organization.url]) throw('User is not registered')
            const subscription = user.subscriptions[req.organization.url]
            return webPush.sendNotification(subscription, payload, options)
        })
        .then((res) => {
            return res.json({ found: res })
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });    
        })
}
