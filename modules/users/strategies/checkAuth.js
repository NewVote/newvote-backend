'use strict';

/**
 * Module dependencies.
 */
let path = require('path'),
    config = require(path.resolve('./config/config')),
    passport = require('passport'),
    passportJWT = require('passport-jwt'),
    JWTStrategy = passportJWT.Strategy,
    User = require('mongoose').model('User');

module.exports = function() {
    const checkOptions = {
        jwtFromRequest: cookieExtractor,
        secretOrKey: config.jwtSecret
    };
    passport.use(
        'check-status',
        new JWTStrategy(checkOptions, function(jwtPayload, done) {
            User.findOne({ _id: jwtPayload._id }, function(err, user) {
                if (err) {
                    console.log('err');

                    return done(err, false);
                }

                if (user) {
                    return done(null, user);
                } else {
                    return done(null, false);
                }
            });
        })
    );
};

function cookieExtractor(req) {
    const { credentials } = req.cookies;
    if (!credentials) return null;

    const token = JSON.parse(credentials).token;
    return token;
}
