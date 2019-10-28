'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * Article Schema
 */
let FeedSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
    news: [{
        message: {
            type: String
        },
        date: {
            type: Date,
            default: Date.now
        },
        user: {
            type: Schema.ObjectId,
            ref: 'User'
        },
    }]
});

mongoose.model('Feed', FeedSchema);
