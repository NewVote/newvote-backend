const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
	body: Joi.object().keys({
		created: Joi.date(),
		name: Joi.string().required(),
		description: Joi.string(),
		imageUrl: Joi.string(),
		user: Joi.objectId(),
		mediaHeading: Joi.string(),
		solutionMetaData: Joi.object(),
		topics: Joi.array(),
		organizations: Joi.objectId(),
		softDeleted: Joi.boolean(),
		suggestion: Joi.objectId()
	})
}

module.exports = {
	schema
}
