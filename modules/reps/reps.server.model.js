'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/**
 * Article Schema
 */
let RepSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    name: {
        type: String,
        trim: true,
        required: 'Name cannot be blank'
    },
    position: {
        type: String
    },
    description: {
        type: String,
        default: '',
        trim: true
    }, 
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
    issues: [{
        type: Schema.ObjectId,
        ref: 'Issue',
        required: true
    }],
    solutions: [{
        type: Schema.ObjectId,
        ref: 'Solution',
        required: true
    }],
    proposals: [{
        type: Schema.ObjectId,
        ref: 'Proposal'
    }],
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
});


mongoose.model('Rep', RepSchema);
