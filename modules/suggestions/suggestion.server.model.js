'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var SuggestionSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	title: {
		type: String,
		trim: true,
		required: 'Title cannot be empty'
	},
	description: {
		type: String,
		default: '',
		trim: true,
		required: 'Summary cannot be empty'
	},
	statements: {
		type: String,
		default: '',
		trim: true
	},
	media: [{
		type: String,
		default: '',
		trim: true,
	}],
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	parentType: {
		type: String,
		required: function () { return this.parent }
	},
	parent: {
		type: Schema.ObjectId,
		refPath: 'parentType'
	},
	status: { // status: 1=approved 0=pending -1=declined
		type: Number,
		default: 0
	},
	votes: {
		up: Number,
		down: Number,
		total: Number,
		currentUser: {
			type: Schema.ObjectId,
			ref: 'Vote'
		}
	},
	organizations: {
		type: Schema.ObjectId,
		ref: 'Organization'
	},
	softDeleted: {
		type: Boolean,
		default: false
	}
});

mongoose.model('Suggestion', SuggestionSchema);
