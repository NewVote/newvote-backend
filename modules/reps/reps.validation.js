const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        name: Joi.string(),
        position: Joi.string(),
        description: Joi.objectId(),
        organizations: Joi.objectId(),
        issues: Joi.array(),
        solutions: Joi.solutions(),
        proposals: Joi.array(),
        user: Joi.objectId()
    })
}

module.exports = {
    schema
}
