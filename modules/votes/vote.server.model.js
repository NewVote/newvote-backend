'use strict'

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema

/**
 * Article Schema
 */
let VoteSchema = new Schema({
    created: {
        type: Date,
        default: Date.now,
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    objectType: {
        type: String,
        required: true,
    },
    object: {
        type: Schema.ObjectId,
        refPath: 'objectType',
    },
    voteValue: {
        type: Number,
        enum: [-1, -0.5, 0, 0.5, 1],
    },
})

VoteSchema.index({ object: 1, user: 1 }, { unique: true })

mongoose.model('Vote', VoteSchema)
