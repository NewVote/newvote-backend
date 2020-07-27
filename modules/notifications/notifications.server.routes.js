'use strict'

// Progress Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('../generic.server.policy'),
    notificationsController = require('./notifications.server.controller'),
    jwt = require('express-jwt')

const jwtConfig = {
    secret: config.jwtSecret,
    credentialsRequired: false,
    algorithms: ['RS256'],
}
module.exports = function (app) {
    app.route('/api/notifications')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(notificationsController.list)
        .post(notificationsController.create)

    app.route('/api/notifications/:notificationId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(notificationsController.read)
        .put(notificationsController.update)
        .delete(notificationsController.delete)

    // Finish by binding the user middleware
    app.param('notificationId', notificationsController.notificationByID)
}
