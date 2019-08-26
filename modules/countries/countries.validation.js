const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		title: Joi.string().required(),
		code: Joi.string().required(),
	})
}

module.exports = {
	schema
}
