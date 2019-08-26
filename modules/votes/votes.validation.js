const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		created: Joi.date(),
		user: Joi.objectId(),
		objectType: Joi.object(),
		object: Joi.objectId(),
		voteValue: Joi.number()
	})
}

module.exports = {
	schema
}
