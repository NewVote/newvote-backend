'use strict';

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
        './modules/core/errors.server.controller'
    )),
    webPush = require('web-push');


const options = {
    vapidDetails: {
        subject: 'https://newvote.org',
        publicKey: config.vapid.VAPID_PUB,
        privateKey: config.vapid.VAPID_PRIV
    },
    TTL: 60
}

exports.create = (req, res) => {
    // id is the _id of the user that made the subscription request
    const { subscriptionId: id } = req.params
    const { endpoint, expirationTime, keys } = req.body
    const subscription = {
        endpoint,
        expirationTime,
        keys
    }

    User.findOne({ _id: id })
        .select('_id pushSubscription subscriptions')
        .then((user) => {
            if (!user) throw('User does not exist')
            let { pushSubscription = [], subscriptions = {} } = user
           
            pushSubscription.push(subscription)
            user.pushSubscription = pushSubscription
            user.markModified('pushSubscription')

            if (!subscriptions[req.organization._id]) {
                subscriptions[req.organization._id] = { issues: [], isSubscribed: false }
            }

            let path = 'subscriptions' + '.' + req.organization._id
            user.markModified(path)

            return user.save()
        })
        .then((user) => {
            return res.json(user.subscriptions);
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}

exports.update = (req, res) => {
    const { subscriptionId: id } = req.params
    User.findOne({ _id: id })
        .then((user) => {
            if (!user) throw('User does not exist')
            user.pushSubscription = {}
            user.markModified('pushSubscription')
            return user.save()
        })
        .then((data) => {
            return res.json(data)
        })
        .catch((err) => {
            console.log(err, 'err on update')
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
    const { url } = req.organization
    const { subscriptionId: id } = req.params
    const { title, description } = req.body
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
            if (!user.subscriptions[req.organization.url]) throw('User is not subscribed to organization')
            const subscription = user.subscriptions[req.organization.url]
            return webPush.sendNotification(subscription, JSON.stringify(notificationPayload), options)
        })
        .then((data) => {
            return res.json(data)
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });    
        })
}

exports.handleIssueSubscription = (req, res) => {
    const issueId = req.body.issueId;
    const { subscriptionId: userId } = req.params; 
    const organization = req.organization;
    const userPromise = User.findOne({ _id: userId })
    const issuePromise = Issue.findOne({ _id: issueId })
    
    Promise.all([userPromise, issuePromise])
        .then(([user, issue]) => {
            const { subscriptions } = user
            let { issues = [] } = subscriptions[organization._id]
            if (!issue) throw('Issue does not exist')
            console.log(issues, 'before issues length')
            // No issues currently so can short circuit objectId checks and return
            // subscription object to client
            if (!issues.length) {
                console.log('inside issues as no length')
                issues.push(issue._id)
                user.subscriptions[organization._id].issues = issues;
                let path = 'subscriptions' + '.' + organization._id
                user.markModified(path)
                console.log('before user save')
                return user.save()
            }
            console.log('issues as objectIds')
            // Use the original issueId since we converted it to string
            const issuesAsObjectIds = issues.map((item) => {
                return mongoose.Types.ObjectId(item).toString()
            })

            console.log('does the issue exist')

            const doesIssueIdExistInIssuesArray = issuesAsObjectIds.some((item) => {
                return mongoose.Types.ObjectId(item).equals(issueId);
            })

            console.log('normal handler')
            // add or remove issue id from subscriptions object
            if (!doesIssueIdExistInIssuesArray) {
                issues.push(issue._id)
            } else {
                const index = issues.findIndex((item) => {
                    return item.equals(issueId);
                })
                issues = [...issues.splice(0, index), ...issues.splice(index+1, issues.length)] 
            }

            console.log('assigning the issues object to user');
            user.subscriptions[organization._id].issues = issues;
            let path = 'subscriptions' + '.' + organization._id
            user.markModified(path)

            return user.save()
        })
        .then((user) => {
            return res.json({ subscriptions: user.subscriptions })
        })
        .catch((err) => {
            console.log(err, 'this is err')
            return res.status(500).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
}