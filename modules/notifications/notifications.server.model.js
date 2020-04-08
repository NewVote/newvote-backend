'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
    Schema = mongoose.Schema;

let NotificationSchema = new Schema({
    parent: {
        type: Schema.ObjectId,
    },
    parentType: {
        type: String
    },
    user: {
        type: Schema.ObjectId,
        ref: 'User'
    },
    organization: {
        type: Schema.ObjectId,
        ref: 'Organization'
    },
    description: {
        type: String
    },
    image: {
        type: String
    }
}, {
    timestamps: { createdAt: 'created_at' }
});

mongoose.model('Notification', NotificationSchema);