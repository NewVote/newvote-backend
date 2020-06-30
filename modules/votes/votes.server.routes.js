'use strict';

const Api = require('twilio/lib/rest/Api');

// Progress Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('../generic.server.policy'),
    votesController = require('./votes.server.controller'),
    jwt = require('express-jwt');

module.exports = function(app) {

    app.route('/api/votes')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(votesController.list)
        .post(votesController.updateOrCreate);
    
    app.route('/api/votes/total')
        // .all(
        //     jwt({ secret: config.jwtSecret, credentialsRequired: false })
        // )
        .get(votesController.getTotalVotes)

    app.route('/api/votes/:voteId')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(votesController.read)
        .put(votesController.update)
        .delete(votesController.delete);

    app.param('voteId', votesController.voteByID);
}