'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var EndorsementSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	title: {
		type: String
	},
	description: {
		type: String,
		default: ''
	},
	imageUrl: {
		type: String,
		default: '',
		trim: true
	},
	organizationName: {
		type: String
	},
	organizationWebsite: {
		type: String
	},
	organizationImageURL: {
		type: String,
		default: ''
	},
	issues: [{
		type: Schema.ObjectId,
		ref: 'Issue'
	}],
	solutions: [{
		type: Schema.ObjectId,
		ref: 'Solution'
	}],
	proposals: [{
		type: Schema.ObjectId,
		ref: 'Proposal'
	}],
});

mongoose.model('Endorsement', EndorsementSchema);
