const {
    Joi
} = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const schema = {
    body: Joi.object().keys({
        created: Joi.date(),
        organizations: Joi.objectId(),
        news: Joi.array()
    })
}

module.exports = {
    schema
}
