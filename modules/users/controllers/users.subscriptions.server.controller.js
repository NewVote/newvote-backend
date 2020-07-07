'use strict'

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Issue = mongoose.model('Issue'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller',
    )),
    ObjectId = require('mongoose').Types.ObjectId,
    webPush = require('web-push')

const options = {
    vapidDetails: {
        subject: 'https://newvote.org',
        publicKey: config.vapid.VAPID_PUB,
        privateKey: config.vapid.VAPID_PRIV,
    },
    TTL: 60,
}

exports.create = (req, res) => {
    // id is the _id of the user that made the subscription request
    const { subscriptionId: id } = req.params
    const { endpoint, expirationTime, keys } = req.body
    const { _id: organizationId } = req.organization
    const subscription = {
        endpoint,
        expirationTime,
        keys,
    }

    User.findOne({ _id: id })
        .select('_id subscriptions')
        .then((user) => {
            if (!user) throw 'User does not exist'
            let { subscriptions = {}, subscriptionsActive = 'DEFAULT' } = user

            // User has not been prompted before to accept notifications
            // if (subscriptionsActive === 'DEFAULT') {
            //     user.subscriptionsActive = 'ACCEPTED'
            // }

            if (!subscriptions[organizationId]) {
                subscriptions[organizationId] = {
                    isSubscribed: true,
                    issues: [],
                    communityUpdates: false,
                    pushSubscriptions: [],
                }
            }

            if (!subscriptions[organizationId].pushSubscriptions) {
                subscriptions[organizationId].pushSubscriptions = []
            }
            subscriptions[organizationId].pushSubscriptions.push(subscription)
            user.subscriptions = subscriptions

            let path = 'subscriptions' + '.' + organizationId
            user.markModified(path)

            return user.save()
        })
        .then((user) => {
            return res.json(user.subscriptions)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.update = (req, res) => {
    const { subscriptionId: id } = req.params
    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw 'User does not exist'
            // user.pushSubscription = {}
            // user.markModified('pushSubscription')
            return user.save()
        })
        .then((data) => {
            return res.json(data)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.delete = (req, res) => {
    const { _id: id } = req.user
    const { subscription } = req.body

    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw 'User does not exist'
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}

exports.handleSubscriptionCreation = (req, res) => {
    const issueId = req.body.issueId
    const { subscriptionId: userId } = req.params
    const organization = req.organization
    const userPromise = User.findOne({ _id: userId })
    const issuePromise = Issue.findOne({ _id: issueId })
    Promise.all([userPromise, issuePromise])
        .then(([user, issue]) => {
            const { subscriptions = {} } = user
            // if subscriptions object does not exist initialize it
            // communityUpdates to true, as existence of a subscription shows
            // users giving permission
            if (!subscriptions[organization._id]) {
                subscriptions[organization._id] = {
                    issues: [],
                    autoUpdates: false,
                    communityUpdates: false,
                    isSubscribed: true,
                    pushSubscriptions: [],
                }
            }
            // if issue._id is not saved as a string then it will fail in search
            // when creating a notification
            const issueIdAsString = issue._id.toString()
            let { issues = [] } = subscriptions[organization._id]
            if (!issue) throw 'Issue does not exist'
            // No issues currently so can short circuit objectId checks and return
            // subscription object to client
            if (!issues.length) {
                issues.push(issueIdAsString)
                subscriptions[organization._id].issues = issues
                user.subscriptions = subscriptions
                let path = 'subscriptions' + '.' + organization._id
                user.markModified(path)
                return user.save()
            }
            // Use the original issueId since we converted it to string
            const doesIssueIdExistInIssuesArray = issues.some((item) => {
                const itemString = new ObjectId(item).toString()
                return itemString === issueId
            })
            // add or remove issue id from subscriptions object
            if (!doesIssueIdExistInIssuesArray) {
                issues.push(issueIdAsString)
            } else {
                const index = issues.findIndex((item) => {
                    return issueId === item.toString()
                })
                issues = [
                    ...issues.splice(0, index),
                    ...issues.splice(index + 1, issues.length),
                ]
            }

            user.subscriptions[organization._id].issues = issues
            user.subscriptions[organization._id].isSubscribed = true
            console.log(user.subscriptions, 'before save')
            let path = 'subscriptions' + '.' + organization._id
            let issuePath = path + '.issues'
            // With a schema type mixed, need to mark as modified to update the user object field
            user.markModified(path)
            user.markModified(issuePath)
            return user.save()
        })
        .then((user) => {
            console.log(
                user.subscriptions,
                'this is user.subscriptions after save',
            )
            return res.json({ subscriptions: user.subscriptions })
        })
        .catch((err) => {
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err),
            })
        })
}
