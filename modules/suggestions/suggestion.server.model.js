'use strict'

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    createSlug = require('../helpers/slug')

/**
 * Article Schema
 */
let SuggestionSchema = new Schema({
    created: {
        type: Date,
        default: Date.now,
    },
    title: {
        type: String,
        trim: true,
        required: 'Title cannot be empty',
    },
    type: {
        type: String,
        enum: ['solution', 'action', 'issue', 'other'],
    },
    description: {
        type: String,
        default: '',
        trim: true,
        required: 'Summary cannot be empty',
    },
    statements: {
        type: String,
        default: '',
        trim: true,
    },
    media: [
        {
            type: String,
            default: '',
            trim: true,
        },
    ],
    user: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    parentType: {
        type: String,
    },
    parentTitle: {
        type: String,
    },
    parent: {
        type: Schema.ObjectId,
    },
    status: {
        // status: 1=approved 0=pending -1=declined
        type: Number,
        default: 0,
    },
    votes: {
        up: Number,
        down: Number,
        total: Number,
        currentUser: {
            type: Schema.ObjectId,
            ref: 'Vote',
        },
    },
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization',
    },
    softDeleted: {
        type: Boolean,
        default: false,
    },
    slug: {
        type: String,
    },
})

SuggestionSchema.statics.generateUniqueSlug = function (
    title,
    suffix,
    callback,
) {
    let _this = this
    let possibleSlug = createSlug(title) + (suffix || '')

    _this.findOne(
        {
            slug: possibleSlug,
        },
        function (err, slug) {
            if (!err) {
                if (!slug) {
                    callback(possibleSlug)
                } else {
                    return _this.generateUniqueSlug(
                        title,
                        (suffix || 0) + 1,
                        callback,
                    )
                }
            } else {
                callback(null)
            }
        },
    )
}

mongoose.model('Suggestion', SuggestionSchema)
