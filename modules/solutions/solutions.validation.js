const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        title: Joi.string().required(),
        description: Joi.string(),
        imageUrl: Joi.string(),
        user: Joi.objectId(),
        comments: Joi.array(),
        issues: Joi.array(),
        proposals: Joi.array(),
        votes: Joi.object(),
        tags: Joi.array(),
        likert: Joi.boolean(),
        organizations: Joi.objectId(),
        softDeleted: Joi.boolean(),
        suggestionTemplate: Joi.objectId()
    })
}

module.exports = {
    schema
}