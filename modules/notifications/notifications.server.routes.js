'use strict'

// Progress Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('../generic.server.policy'),
    notificationsController = require('./notifications.server.controller'),
    jwt = require('express-jwt')

module.exports = function (app) {
    app.route('/api/notifications')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed,
        )
        .get(notificationsController.list)
        .post(notificationsController.create)

    app.route('/api/notifications/:notificationId')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed,
        )
        .get(notificationsController.read)
        .put(notificationsController.update)
        .delete(notificationsController.delete)

    // Finish by binding the user middleware
    app.param('notificationId', notificationsController.notificationByID)
}
