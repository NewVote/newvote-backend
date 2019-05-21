'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */

 var FutureLeaderSchema = new Schema({
     email: {
         type: String,
         trim: true,
         unique: true,
         required: 'Email must be provided.'
     },
     leaderVerificationCode: {
         type: String,
         default: ''
     },
     organization: {
        type: Schema.ObjectId,
		ref: 'Organization',
		unique: true
     }
 })

 mongoose.model('FutureLeader', FutureLeaderSchema);