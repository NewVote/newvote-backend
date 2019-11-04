'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let FeedSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
    parent: {
        type: String,
    },
    parentType: {
        type: String
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
