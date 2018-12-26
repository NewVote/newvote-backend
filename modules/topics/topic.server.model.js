'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var TopicSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	name: {
		type: String,
		trim: true,
		test: true,
		required: 'Title cannot be blank'
	},
	description: {
		type: String,
		default: '',
		trim: true,
		test: true,
	},
	imageUrl: {
		type: String,
		default: '',
		trim: true
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	organizations: {
		type: Schema.ObjectId,
		ref: 'Organization'
	}
});

TopicSchema.index({ 'name': 'text', 'description': 'text' });
mongoose.model('Topic', TopicSchema);
