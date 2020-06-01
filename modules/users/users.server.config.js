'use strict';

/**
 * Module dependencies.
 */
let passport = require('passport'),
    User = require('mongoose')
        .model('User'),
    path = require('path'),
    config = require(path.resolve('./config/config')),
    jwt = require('express-jwt');

/**
 * Module init function.
 */
module.exports = function (app, db) {
    // Serialize sessions
    passport.serializeUser(function (user, done) {
        console.log(user, 'we are serialized')
        console.log(user.id, 'this is the string to serialize')
        done(null, user.id);
    });

    // Deserialize sessions
    passport.deserializeUser(function (id, done) {
        User.findById(id)
            .select('-salt -password -verificationCode')
            .populate('country')
            .exec(function (err, user) {
                console.log(user, 'we are deserialized')
                done(err, user);
            });
    });

    // Initialize strategies
    config.utils.getGlobbedPaths(path.join(__dirname, './strategies/**/*.js'))
        .forEach(function (strategy) {
            require(path.resolve(strategy))(config);
        });

    // Add passport's middleware
    app.use(passport.initialize());
    app.use(passport.session());
};
