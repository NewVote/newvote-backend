const {
    Joi
} = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        title: Joi.string().required(),
        description: Joi.string(),
        imageUrl: Joi.string(),
        user: Joi.objectId(),
        solutions: Joi.array(),
        goals: Joi.array(),
        votes: Joi.object(),
        likert: Joi.boolean(),
        organizations: Joi.objectId(),
        softDeleted: Joi.boolean(),
        suggestionTemplate: Joi.objectId(),
        slug: Joi.string()
    })
}

module.exports = {
    schema
}
