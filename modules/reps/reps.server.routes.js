'use strict'

let repController = require('./reps.server.controller'),
    policy = require('../generic.server.policy'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    jwt = require('express-jwt');

module.exports = function (app) {

    // Get all Reps
    app.route('/api/reps')
        .all(jwt({ secret: config.jwtSecret, credentialsRequired: false }))
        .get(repController.list)
        .post(repController.create)
        .put(repController.updateMany)

    app.route('/api/reps/remove')
        .put(repController.deleteMany)

    // Single Rep

    app.route('/api/reps/:repId')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(repController.read)
        .put(repController.update)
        .delete(repController.delete);

    app.param('repId', repController.repByID)
}