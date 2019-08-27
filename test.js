'use strict';

/**
 * Module dependencies.
 */
let path = require('path');
let app = require(path.resolve('./config/lib/app'));

app.init(function() {
    console.log('Initialized test automation');
});
