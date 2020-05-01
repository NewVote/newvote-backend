'use strict'

let mediaController = require('./media.server.controller'),
    policy = require('../generic.server.policy'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    jwt = require('express-jwt');

module.exports = function (app) {
  
    app.route('/api/media')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(mediaController.list)
        .post(mediaController.create);

    app.route('/api/media/:mediaId')
        .all(
            jwt({ secret: config.jwtSecret, credentialsRequired: false }),
            policy.isAllowed
        )
        .get(mediaController.read)
        .put(mediaController.update)
        .delete(mediaController.delete);
    
    app.route('/api/meta/:uri')
        .get(mediaController.getMeta);

    app.param('mediaId', mediaController.mediaByID)
}