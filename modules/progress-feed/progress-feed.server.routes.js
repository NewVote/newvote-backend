'use strict';

// Progress Feed Routes
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('./generic.server.policy'),
    progressFeedController = require('./progress-feed.server.controller'),
    jwt = require('express-jwt');

module.exports = function(app) {

    app.route('/api/progress-feed')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(progressFeedController.list)
        .post(progressFeedController.create);

    app.route('/api/progress/:progressFeedId')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(progressFeedController.read)
        .put(progressFeedController.update)
        .delete(progressFeedController.delete);

    // Finish by binding the user middleware
    app.param('progressFeedId', progressFeedController.progressFeedByID);
};
    
