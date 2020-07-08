const { Joi } = require('celebrate')
Joi.objectId = require('joi-objectid')(Joi)

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        user: Joi.objectId(),
        title: Joi.string().required(),
        description: Joi.string(),
        image: Joi.string(),
        imageOnly: Joi.boolean(),
        url: Joi.string(),
        issues: Joi.array(),
        solutions: Joi.array(),
        proposals: Joi.array(),
        votes: Joi.object(),
        organizations: Joi.objectId(),
    }),
}

module.exports = {
    schema,
}
