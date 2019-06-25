const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        description: Joi.string(),
        longDescription: Joi.string(),
        url: Joi.string().required(),
        organiaztionUrl: Joi.string(),
        imageUrl: Joi.string(),
        iconUrl: Joi.string(),
        owner: Joi.objectId(),
        futureOwner: Joi.objectId(),
        moderators: Joi.array(),
    })
}

module.exports = {
    schema
}
