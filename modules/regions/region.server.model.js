'use strict';

/**
 * Module dependencies.
 */
let mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Region Schema
 */
let RegionSchema = new Schema({
	name: {
		type: String,
		unique: true,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	suburbs: [{
		type: String,
		required: true
	}],
	postcodes: [{
		type: String,
		required: true
	}],
});

mongoose.model('Region', RegionSchema);
