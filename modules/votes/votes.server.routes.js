'use strict'

const Api = require('twilio/lib/rest/Api')

// Progress Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('../generic.server.policy'),
    votesController = require('./votes.server.controller'),
    jwt = require('express-jwt')

module.exports = function (app) {
    const jwtConfig = {
        secret: config.jwtSecret,
        credentialsRequired: false,
        algorithms: ['RS256'],
    }

    app.route('/api/votes')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(votesController.list)
        .post(votesController.updateOrCreate)

    app.route('/api/votes/total')
        .all(jwt(jwtConfig))
        .get(votesController.getTotalVotes)

    app.route('/api/votes/:voteId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(votesController.read)
        .put(votesController.update)
        .delete(votesController.delete)

    app.param('voteId', votesController.voteByID)
}
