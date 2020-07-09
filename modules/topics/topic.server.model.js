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
let TopicSchema = new Schema({
    created: {
        type: Date,
        default: Date.now,
    },
    name: {
        type: String,
        trim: true,
        test: true,
        required: 'Title cannot be blank',
    },
    description: {
        type: String,
        default: '',
        trim: true,
        test: true,
    },
    imageUrl: {
        type: String,
        default: '',
        trim: true,
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User',
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

TopicSchema.statics.generateUniqueSlug = function (title, suffix, callback) {
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

TopicSchema.index({
    name: 'text',
    description: 'text',
})
mongoose.model('Topic', TopicSchema)
