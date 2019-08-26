const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		created: Joi.date(),
		user: Joi.objectId(),
		title: Joi.string().required(),
		description: Joi.string(),
		imageUrl: Joi.string(),
		organizationName: Joi.string(),
		organizationWebsite: Joi.string(),
		organizationImageURL: Joi.string(),
		issues: Joi.array(),
		solutions: Joi.array(),
		proposals: Joi.array(),
	})
}

module.exports = {
	schema
}
