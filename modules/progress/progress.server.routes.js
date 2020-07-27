'use strict'

// Progress Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('../generic.server.policy'),
    progressController = require('./progress.server.controller'),
    jwt = require('express-jwt')

module.exports = function (app) {
    const jwtConfig = {
        secret: config.jwtSecret,
        credentialsRequired: false,
        algorithms: ['RS256'],
    }

    app.route('/api/progress')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(progressController.list)
        .post(progressController.create)

    app.route('/api/progress/:progressId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(progressController.read)
        .put(progressController.update)
        .delete(progressController.delete)

    // Finish by binding the user middleware
    app.param('progressId', progressController.progressByID)
}
