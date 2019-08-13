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
	organizationName: {
		type: String,
		trim: true
	},
	description: {
		type: String,
		trim: true
	},
	longDescription: {
		type: String,
		trim: true
	},
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
	futureOwner: {
		type: Schema.ObjectId,
		ref: 'FutureLeader'
	},
	moderators: [{
		type: Schema.ObjectId,
		ref: 'User'
	}],
	softDeleted: {
		type: Boolean,
		default: false
	},
	authType: {
		type: Number,
		default: 0,
		required: true
	},
	authUrl: {
		type: String,
		trim: true,
		required: function () {
			if(this.authType === 0) {
				return false;
			}else {
				return true;
			}
		}
	},
	authEntityId: {
		type: String
	},
	privateOrg: {
		type: Boolean,
		required: true,
		default: false
	}
});

mongoose.model('Organization', OrganizationSchema);
