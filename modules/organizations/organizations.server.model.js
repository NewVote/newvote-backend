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
	prettyName: {
		type: String,
		trim: true,
		required: 'Name cannot be blank'
	},
	url: {
		type: String,
		trim: true,
		required: 'Url cannot be blank'
	},
	imageUrl: {
		type: String,
		trim: true
	},
	owner: {
		type: Schema.ObjectId,
		ref: 'User'
	}
});

mongoose.model('Organization', OrganizationSchema);
