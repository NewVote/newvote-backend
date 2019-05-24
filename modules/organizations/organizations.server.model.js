'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var OrganizationSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	name: {
		type: String,
		trim: true,
		required: 'Name cannot be blank'
	},
	description: {
		type: String,
		trim: true
	},
	longDescription: {
		type: String,
		trim: true
	}
	url: {
		type: String,
		trim: true,
		required: 'Url cannot be blank',
		unique: 'This url is already in use.',
	},
	organizationUrl: {
		type: String,
		trim: true
	},
	imageUrl: {
		type: String,
		trim: true
	},
	iconUrl: {
		type: String,
		trim: true
	},
	owner: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	moderators: [{
		type: Schema.ObjectId,
		ref: 'User'
	}]
});

mongoose.model('Organization', OrganizationSchema);
