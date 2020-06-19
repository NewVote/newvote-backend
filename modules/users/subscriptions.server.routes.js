'use strict'

let subscriptionController = require('./controllers/users.subscriptions.server.controller'),
    policy = require('../generic.server.policy'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    jwt = require('express-jwt');

module.exports = function (app) {

    // Single Rep
    app.route('/api/subscriptions/:subscriptionId')
        // .all(
        //     jwt({ secret: config.jwtSecret, credentialsRequired: false }),
        //     policy.isAllowed
        // )
        .post(subscriptionController.create)
        .put(subscriptionController.update)
        .delete(subscriptionController.delete);

    app.route('/api/subscriptions/issue/:subscriptionId')
        .put(subscriptionController.handleSubscriptionCreation)
}