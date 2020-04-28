'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    createSlug = require('../helpers/slug');


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
    },
    notifications: [{
        type: Schema.ObjectId,
        ref: 'Notification'
    }],
    slug: {
        type: String
    }
});


IssueSchema.statics.generateUniqueSlug = function (title, suffix, callback) {
    let _this = this;
    let possibleSlug = createSlug(title) + (suffix || '');

    _this.findOne({
        slug: possibleSlug
    },
    function (err, slug) {
        if (!err) {
            if (!slug) {
                callback(possibleSlug);
            } else {
                return _this.generateUniqueSlug(
                    title,
                    (suffix || 0) + 1,
                    callback
                );
            }
        } else {
            callback(null);
        }
    }
    );
};

IssueSchema.index({
    'name': 'text',
    'description': 'text'
});
mongoose.model('Issue', IssueSchema);
