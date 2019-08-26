'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash');

/**
 * Extend user's controller
 */
module.exports = _.extend(
	require('./controllers/users.authentication.server.controller'),
	require('./controllers/users.verification.server.controller'),
	require('./controllers/users.authorization.server.controller'),
	require('./controllers/users.password.server.controller'),
	require('./controllers/users.profile.server.controller')
);
