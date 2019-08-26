const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		email: Joi.string(),
		verificationCode: Joi.string(),
		organizations: Joi.objectId(),
		salt: Joi.string(),
		emailDelivered: Joi.boolean()
	})
}

module.exports = {
	schema
}
