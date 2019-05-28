'use strict';

/**
 * Module dependencies.
 */


var mongoose = require('mongoose'),
 	_ = require('lodash'),
	Schema = mongoose.Schema,
	crypto = require('crypto'),
	generatePassword = require('generate-password'),
	owasp = require('owasp-password-strength-test'),
	arrayUniquePlugin = require('mongoose-unique-array');

owasp.config({
	allowPassphrases: true,
	maxLength: 128,
	minLength: 6,
	minPhraseLength: 20,
	minOptionalTestsToPass: 3
})
/**
 * Article Schema
 */

 var FutureLeaderSchema = new Schema({
     email: {
         type: String,
         trim: true,
         unique: true,
         required: 'Email must be provided.'
     },
     verificationCode: {
         type: String,
         default: ''
     },
     organizations: [{
        type: Schema.ObjectId,
		ref: 'Organization',
		unique: true
     }],
     salt: {
		type: String
	},
	emailDelivered: {
		type: Boolean,
		default: false
	}
 })


 /**
 * Hook a pre save method to hash the password
 */

 // With Future leaders the user does not sign up so have to pre generate the salt for hashing

 FutureLeaderSchema.pre('save', function (next) {
    this.salt = crypto.randomBytes(16)
        .toString('base64');
	next();
});


 /**
 * Create instance method for hashing a verification code (sent by SMS)
 */
FutureLeaderSchema.methods.hashVerificationCode = function (code) {
	if(this.salt && code) {
		console.log('hashing code: ', code);
		return crypto.pbkdf2Sync(code.toString(), Buffer.from(this.salt, 'base64'), 100000, 64, 'SHA512')
			.toString('base64');
	} else {
		console.log('salt was not present');
		return code;
	}
};

/**
 * Generates a random passphrase that passes the owasp test.
 * Returns a promise that resolves with the generated passphrase, or rejects with an error if something goes wrong.
 * NOTE: Passphrases are only tested against the required owasp strength tests, and not the optional tests.
 */
FutureLeaderSchema.statics.generateRandomPassphrase = function () {
	return new Promise(function (resolve, reject) {
		var password = '';
		var repeatingCharacters = new RegExp('(.)\\1{2,}', 'g');

		// iterate until the we have a valid passphrase.
		// NOTE: Should rarely iterate more than once, but we need this to ensure no repeating characters are present.
		while(password.length < 20 || repeatingCharacters.test(password)) {
			// build the random password
			password = generatePassword.generate({
				length: Math.floor(Math.random() * (20)) + 20, // randomize length between 20 and 40 characters
				numbers: true,
				symbols: false,
				uppercase: true,
				excludeSimilarCharacters: true,
			});

			// check if we need to remove any repeating characters.
			password = password.replace(repeatingCharacters, '');
		}

		// Send the rejection back if the passphrase fails to pass the strength test
		if(owasp.test(password)
			.requiredTestErrors.length) {
			reject(new Error('An unexpected problem occured while generating the random passphrase'));
		} else {
			// resolve with the validated passphrase
			resolve(password);
		}
	});
};

FutureLeaderSchema.plugin(arrayUniquePlugin);
mongoose.model('FutureLeader', FutureLeaderSchema);