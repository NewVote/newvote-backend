'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let ProgressSchema = new Schema({
    currentStates: [
        { 
            state: String,
            active: Boolean,
        }
    ],
    parent: {
        type: Schema.ObjectId,
    },
    parentType: {
        type: String
    },
    organization: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
}, {
    timestamps: true
});

mongoose.model('Progress', ProgressSchema);