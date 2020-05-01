const {
    Joi
} = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created_at: Joi.date(),
        parent: Joi.objectId(),
        parentType: Joi.string(),
        description: Joi.string(),
        imageUrl: Joi.string(),
        user: Joi.objectId(),
        organizations: Joi.objectId(),
    })
}

module.exports = {
    schema
}
