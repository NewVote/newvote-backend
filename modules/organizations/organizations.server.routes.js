'use strict'

let orgController = require('./organizations.server.controller'),
    policy = require('../generic.server.policy'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    jwt = require('express-jwt')

module.exports = function (app) {
    const jwtConfig = {
        secret: config.jwtSecret,
        credentialsRequired: false,
        algorithms: ['RS256'],
    }

    app.route('/api/organizations')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(orgController.list)
        // .post(celebrate(schema))
        .post(orgController.create)

    app.route('/api/organizations/:organizationId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(orgController.read)
        .put(orgController.update)
        .patch(orgController.patch)
        .delete(orgController.delete)

    app.param('organizationId', orgController.organizationByID)
}
