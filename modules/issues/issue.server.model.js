'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Article Schema
 */
let IssueSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    name: {
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
        default: 'assets/issue-default.png',
        trim: true,
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    mediaHeading: {
        type: String
    },
    solutionMetaData: {
        votes: {
            up: Number,
            down: Number,
            total: Number
        },
        solutionCount: Number,
        totalTrendingScore: Number,
        lastCreated: Date
    },
    topics: [{
        type: Schema.ObjectId,
        ref: 'Topic'
    }],
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
    softDeleted: {
        type: Boolean,
        default: false
    },
    suggestionTemplate: {
        type: Schema.ObjectId,
        ref: 'Suggestion'
    }, 
    progressFeed: {
        type: Schema.ObjectId,
        ref: 'Feed'
    },
    progress: {
        type: Schema.ObjectId,
        ref: 'Progress'
    }
});

IssueSchema.index({ 'name': 'text', 'description': 'text' });
mongoose.model('Issue', IssueSchema);
