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
let ProposalSchema = new Schema({
    created: {
        type: Date,
        default: Date.now,
    },
    title: {
        type: String,
        trim: true,
        required: 'Title cannot be blank',
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    imageUrl: {
        type: String,
        default: 'assets/action-default.png',
        trim: true,
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User',
    },
    solutions: [
        {
            type: Schema.ObjectId,
            ref: 'Solution',
            required: true,
        },
    ],
    goals: [
        {
            type: Schema.ObjectId,
            ref: 'Solution',
        },
    ],
    votes: {
        up: Number,
        down: Number,
        total: Number,
        currentUser: {
            type: Schema.ObjectId,
            ref: 'Vote',
        },
    },
    likert: {
        type: Boolean,
        default: false,
    },
    organizations: {
        type: Schema.ObjectId,
        ref: 'Organization',
    },
    softDeleted: {
        type: Boolean,
        default: false,
    },
    suggestionTemplate: {
        type: Schema.ObjectId,
        ref: 'Suggestion',
    },
    slug: {
        type: String,
    },
})

ProposalSchema.statics.generateUniqueSlug = function (title, suffix, callback) {
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

ProposalSchema.index({
    title: 'text',
    description: 'text',
})
mongoose.model('Proposal', ProposalSchema)
