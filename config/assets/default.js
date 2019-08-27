'use strict';

module.exports = {
    server: {
        gruntConfig: 'gruntfile.js',
        gulpConfig: 'gulpfile.js',
        allJS: ['server.js', 'config/**/*.js', 'modules/**/*.js'],
        models: 'modules/*/*.model.js',
        routes: ['modules/*.routes.js', 'modules/**/*.routes.js'],
        sockets: 'modules/**/sockets/**/*.js',
        config: 'modules/**/*.config.js',
        policies: 'modules/**/*.policy.js',
        views: 'modules/**/*.server.view.html'
    }
};
