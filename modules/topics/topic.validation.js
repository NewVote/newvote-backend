const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		created: Joi.date(),
		name: Joi.string().required(),
		description: Joi.string(),
		imageUrl: Joi.string(),
		user: Joi.objectId(),
		organizations: Joi.objectId(),
		softDeleted: Joi.boolean(),
	})
}

module.exports = {
	schema
}
