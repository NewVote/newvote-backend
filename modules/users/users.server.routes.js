'use strict'

module.exports = function (app) {
    // User Routes
    let path = require('path'),
        config = require(path.resolve('./config/config')),
        users = require('./users.server.controller'),
        jwt = require('express-jwt')

    //just using the jwt module to attach the decoded jwt onto the req.user object
    // all other authentication tests are handled on the controller using req.user

    const jwtConfig = {
        secret: config.jwtSecret,
        credentialsRequired: false,
        algorithms: ['RS256'],
    }

    //sms verification
    app.route('/api/users/sms')
        .all(jwt(jwtConfig))
        .post(users.sendVerificationCodeViaSms)

    app.route('/api/users/email')
        .all(jwt(jwtConfig))
        .post(users.sendVerificationCodeViaEmail)

    app.route('/api/users/verify').all(jwt(jwtConfig)).post(users.verify)

    app.route('/api/users/community-verify')
        .all(jwt(jwtConfig))
        .post(users.verifyWithCommunity)

    // Setting up the users profile api
    app.route('/api/users/me').all(jwt(jwtConfig)).get(users.me)

    //
    app.route('/api/users/count').all(jwt(jwtConfig)).get(users.count)

    // app.route('/api/users')
    //     .all(jwt({
    //         secret: config.jwtSecret,
    //         credentialsRequired: false
    //     }))

    app.route('/api/users/:userId/edit')
        .all(jwt(jwtConfig))
        .put(users.updateProfile)

    app.route('/api/users/accounts')
        .all(jwt(jwtConfig))
        .delete(users.removeOAuthProvider)

    app.route('/api/users/password')
        .all(jwt(jwtConfig))
        .post(users.changePassword)

    app.route('/api/users/picture')
        .all(jwt(jwtConfig))
        .post(users.changeProfilePicture)

    app.route('/api/users/tour/:userId').all(jwt(jwtConfig)).patch(users.patch)

    app.route('/api/users/subscription/:userId')
        .all(jwt(jwtConfig))
        .patch(users.patchSubscription)

    // Finish by binding the user middleware
    app.param('userId', users.userByID)
}
