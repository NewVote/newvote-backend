'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    path = require('path'),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    ));


// Track and update the push notification subscriptions of each user


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