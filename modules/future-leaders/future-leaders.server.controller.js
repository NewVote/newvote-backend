'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
	mongoose = require('mongoose'),
	Organization = mongoose.model('Organization'),
	User = mongoose.model('User'),
	FutureLeader = mongoose.model('FutureLeader'),
	errorHandler = require(path.resolve('./modules/core/errors.server.controller')),
	_ = require('lodash');


exports.update = async function (req, res) {
    console.log(req.body, 'this is req.body');
    console.log(req.organization);
    // const { _id: id, futureOwner: email } = req.body;

    // console.log(id, 'this is id', email, 'this is email');
    // // Take the email from input and cross reference against users
    // const users = await User.find({ email });
    
    // // User exists on databse return error
    // if (users.length > 0 ) {
    //     // user exists 

    //     return res.status(400)
    //         .send({
    //             message: 'User exists on database'
    //         })
    // }

    // // User not found, create a future leader and attach it to the 
    // const leader =  new FutureLeader({ email, organization: id });
    // await leader.save(function (err) {
    //     if (!err) {
    //         return res.status(400)
    //             .send({
    //                 message: errorHandler.getErrorMessage(err)
    //             });
    //     }
    // });
    
    // let organization = await Organization.findOne({ _id: id });
    // organization.owner = null;
    // organization.futureOwner = leader._id;

    // organization.save(function (err) {
    //     if (!err) {
    //         return res.status(400)
    //             .send({
    //                 message: errorHandler.getErrorMessage(err)
    //             });
    //     }

    //     return res.json(organization);
    // })
};









