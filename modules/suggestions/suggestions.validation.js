const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        title: Joi.string().required(),
        type: Joi.string().required(),
        description: Joi.string(),
        statements: Joi.string(),
        media: Joi.array(),
        user: Joi.objectId(),
        parentType: Joi.string(),
        parent: Joi.objectId(),
        status: Joi.number(),
        votes: Joi.object(),
        organizations: Joi.objectId(),
        softDeleted: Joi.boolean(),
    })
}

module.exports = {
    schema
}
