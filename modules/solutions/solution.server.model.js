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
let SolutionSchema = new Schema({
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
        default: 'assets/solution-default.png',
        trim: true
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    comments: [{
        type: Schema.ObjectId,
        ref: 'Comment'
    }],
    issues: [{
        type: Schema.ObjectId,
        ref: 'Issue',
        required: true
    }],
    proposals: [{
        type: Schema.ObjectId,
        ref: 'Proposal'
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
    tags: [{
        type: String,
        trim: true
    }],
    likert: {
        type: Boolean,
        default: false
    },
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
    slug: {
        type: String
    }
});

SolutionSchema.statics.generateUniqueSlug = function (title, suffix, callback) {
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

SolutionSchema.index({
    title: 'text',
    description: 'text'
});
mongoose.model('Solution', SolutionSchema);
