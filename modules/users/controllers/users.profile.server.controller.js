'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    mongoose = require('mongoose'),
    multer = require('multer'),
    config = require(path.resolve('./config/config')),
    User = mongoose.model('User');

/**
 * Update user details
 */

exports.patch = function(req, res) {
    let user = req.user;

    if (!user) {
        return res.status(400).send({
            message: 'User is not signed in'
        });
    }

    User.findById(user._id)
        .then(userDoc => {
            if (!userDoc) throw 'User does not exist';
            userDoc.completedTour = true;
            return userDoc.save();
        })
        .then(() => {
            res.status(200).send({ message: 'Tour Complete' });
        })
        .catch(err => {
            return res.status(404).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

exports.update = function(req, res) {
    // Init Variables
    let user = req.user;

    // For security measurement we remove the roles from the req.body object
    delete req.body.roles;

    if (user) {
        // Merge existing user
        user = _.extend(user, req.body);
        user.updated = Date.now();
        user.displayName = user.firstName + ' ' + user.lastName;

        user.save(function(err) {
            if (err) {
                return res.status(400).send({
                    message: errorHandler.getErrorMessage(err)
                });
            } else {
                req.login(user, function(err) {
                    if (err) {
                        res.status(400).send(err);
                    } else {
                        res.json(user);
                    }
                });
            }
        });
    } else {
        res.status(400).send({
            message: 'User is not signed in'
        });
    }
};

exports.updateProfile = function(req, res) {
    // Init Variables
    const { displayName, subscriptions = {} } = req.body

    User.findOne({ _id: req.user._id })
        .select('-password -verificationCode -email -salt')
        .then((user) => {
            if (!user) throw('User is not signed in')

            if (displayName) {
                user.displayName = displayName
            }

            if (subscriptions) {
                user.subscriptions = subscriptions
            }

            user.updated = Date.now();

            return user.save()
        })
        .then((savedUser) => {
            req.login(savedUser, function(err) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    res.json(savedUser);
                }
            });
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })





        
}



/**
 * Update profile picture
 */
exports.changeProfilePicture = function(req, res) {
    let user = req.user;
    let message = null;
    let upload = multer(config.uploads.profileUpload).single(
        'newProfilePicture'
    );
    let profileUploadFileFilter = require(path.resolve('./config/lib/multer'))
        .profileUploadFileFilter;

    // Filtering to upload only images
    upload.fileFilter = profileUploadFileFilter;

    if (user) {
        upload(req, res, function(uploadError) {
            if (uploadError) {
                return res.status(400).send({
                    message: 'Error occurred while uploading profile picture'
                });
            } else {
                user.profileImageURL =
                    config.uploads.profileUpload.dest + req.file.filename;

                user.save(function(saveError) {
                    if (saveError) {
                        return res.status(400).send({
                            message: errorHandler.getErrorMessage(saveError)
                        });
                    } else {
                        req.login(user, function(err) {
                            if (err) {
                                res.status(400).send(err);
                            } else {
                                res.json(user);
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.status(400).send({
            message: 'User is not signed in'
        });
    }
};

/**
 * Send User
 */
exports.me = function(req, res) {
    res.json(req.user || null);
};

/**
 * Get count of all users
 */
exports.count = function(req, res) {
    let org = req.organization;
    let orgUrl = org ? org.url : null;
    const orgMatch = orgUrl ? { 'organizations.url': orgUrl } : {};
    // do some kind of aggregate query that outputs the count
    return User.aggregate([
        {
            $lookup: {
                from: 'organizations',
                localField: 'organizations',
                foreignField: '_id',
                as: 'organizations'
            }
        },
        { $match: orgMatch }
    ])
        .exec()
        .then(users => {
            return res.json(users.length);
        });
};

exports.patchSubscription = function(req, res) {
    console.log('patchSubscription')
    const { subscriptionsActive } = req.body;
    console.log(subscriptionsActive, 'this is subscriptionsActive')

    let user = req.user;

    if (!user) {
        return res.status(400).send({
            message: 'User is not signed in'
        });
    }

    User.findById(user._id)
        .then(userDoc => {
            if (!userDoc) throw 'User does not exist';
            userDoc.subscriptionsActive = subscriptionsActive
            return userDoc.save();
        })
        .then((user) => {
            res.status(200).send({ subscriptionsActive: user.subscriptionsActive });
        })
        .catch(err => {
            return res.status(404).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};