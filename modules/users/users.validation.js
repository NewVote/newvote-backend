const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		firstName: Joi.string(),
		lastName: Joi.string(),
		displayName: Joi.string(),
		email: Joi.email(),
		postalCode: Joi.string(),
		international: Joi.boolean(),
		country: Joi.objectId(),
		username: Joi.string(),
		mobileNumber: Joi.mobileNumber(),
		verified: Joi.boolean(),
		gender: Joi.string(),
		birthYear: Joi.string(),
		income: Joi.string(),
		housing: Joi.string(),
		party: Joi.string(),
		woodfordian: Joi.string(),
		terms: Joi.boolean(),
		password: Joi.string(),
		verificationCode: Joi.string(),
		salt: Joi.string(),
		profileImageURL: Joi.string(),
		provider: Joi.string(),
		roles: Joi.array(),
		updated: Joi.date(),
		created: Joi.date(),
		organizations: Joi.array(),
		resetPasswordToken: Joi.string(),
		resetPasswordExpires: Joi.date(),
	})
}

module.exports = {
	schema
}
