'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Article Schema
 */
var ProposalSchema = new Schema({
	created: {
		type: Date,
		default: Date.now
	},
	title: {
		type: String,
		trim: true,
		required: 'Title cannot be blank'
	},
	description: {
		type: String,
		default: '',
		trim: true
	},
	imageUrl: {
		type: String,
		default: 'assets/action-default.png',
		trim: true
	},
	user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	solutions: [{
		type: Schema.ObjectId,
		ref: 'Solution',
        required: true
	}],
	goals: [{
		type: Schema.ObjectId,
		ref: 'Solution'
	}],
	votes: {
		up: Number,
		down: Number,
		total: Number,
		currentUser: {
			type: Schema.ObjectId,
			ref: 'Vote'
		}
	},
	likert: {
		type: Boolean,
		default: false
	},
	organizations:  {
		type: Schema.ObjectId,
		ref: 'Organization'
	},
	softDeleted: {
		type: Boolean,
		default: false
	},
	suggestion: {
		type: Schema.ObjectId,
		ref: 'Suggestion'
	}
});

ProposalSchema.index({ 'title': 'text', 'description': 'text' });
mongoose.model('Proposal', ProposalSchema);
