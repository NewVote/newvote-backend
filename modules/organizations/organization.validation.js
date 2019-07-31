const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    params: {
        organizationId: Joi.objectId()
    },
    body: Joi.object().keys({
        name: Joi.string().required(),
        organizationName: Joi.string().required(),
        description: Joi.string(),
        longDescription: Joi.string(),
        url: Joi.string().required(),
        organiaztionUrl: Joi.string(),
        imageUrl: Joi.string(),
        iconUrl: Joi.string(),
        owner: Joi.objectId(),
        futureOwner: Joi.objectId(),
        moderators: Joi.array(),
        newLeaderEmail: Joi.string().email(),
        privateOrg: Joi.boolean()
    })
}

module.exports = {
    schema
}
