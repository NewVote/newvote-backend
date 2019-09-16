'use strict';

/**
 * Module dependencies.
 */
let _ = require('lodash'),
    defaultAssets = require('./config/assets/default'),
    prodAssets = require('./config/assets/production'),
    testAssets = require('./config/assets/test'),
    gulp = require('gulp'),
    // babel = require('gulp-babel'),
    gulpLoadPlugins = require('gulp-load-plugins'),
    runSequence = require('run-sequence'),
    plugins = gulpLoadPlugins({
        rename: {
            'gulp-angular-templatecache': 'templateCache'
        }
    }),
    path = require('path'),
    endOfLine = require('os')
        .EOL,
    protractor = require('gulp-protractor')
        .protractor,
    webdriver_update = require('gulp-protractor')
        .webdriver_update,
    webdriver_standalone = require('gulp-protractor')
        .webdriver_standalone,
    node = undefined,
    spawn = require('child_process')
        .spawn,
    debug = true;
    let dotenv = require('gulp-dotenv');
    let rename = require('gulp-rename');
    let config = require('./dist/env.json');

gulp.task('dotenv', function (done) {
    gulp.src('.env')
        .pipe(dotenv())
        .pipe(rename('env.json'))
        .pipe(gulp.dest('dist'))
    done();
})

// Set NODE_ENV to 'test'
gulp.task('env:test', function (done) {
    process.env.NODE_ENV = 'test';
    done();
});

// Set NODE_ENV to 'development'
gulp.task('env:dev', function (done) {
    process.env.NODE_ENV = 'development';
    process.env.RECAPTCHA_SECRET = config.RECAPTCHA_SECRET
    process.env.RECAPTCHA_SECRET = config.RECAPTCHA_SECRET
    process.env.JWT_SECRET = config.JWT_SECRET;
    done();
});

// Set NODE_ENV to 'production'
gulp.task('env:prod', function (done) {
    process.env.NODE_ENV = 'production';
    done();
});

// Set debug to true
gulp.task('debug:true', function (done) {
    debug = true;
    done();
});

// Set debug to false
gulp.task('debug:false', function (done) {
    debug = false;
    done();
});

gulp.task('server', function (done) {
    console.log('starting server task.');
    if(node) node.kill();

    node = spawn('node', ['--inspect=9229', 'server.js'], { stdio: 'inherit' })
    node.on('close', function (code) {
        console.log(`Got code ${code}`);
        if(code === 8) {
            console.log('Error detected, waiting for changes...');
        }
    })
    done();
})

gulp.task('server-debug', function (done) {
    console.log('starting server-debug task.');
    if(node) node.kill();

    node = spawn('node', ['--inspect-brk', 'server.js'], { stdio: 'inherit' })
    node.on('close', function (code) {
        console.log(`Got code ${code}`);
        if(code === 8) {
            console.log('Error detected, waiting for changes...');
        }
    })
    done();
})

// Watch Files For Changes
gulp.task('watch', function (done) {
    // Start livereload
    plugins.livereload.listen();

    // Add watch rules
    gulp.watch(defaultAssets.server.views)
        .on('change', plugins.livereload.changed);
    gulp.watch(defaultAssets.server.allJS, gulp.series('lint'))
        .on('change', plugins.livereload.changed);

    if(process.env.NODE_ENV === 'production') {
        gulp.watch(defaultAssets.server.gulpConfig, gulp.series('lint'));
    } else {
        gulp.watch(defaultAssets.server.gulpConfig, gulp.series('lint'));
        if(debug){
            gulp.watch(_.union(defaultAssets.server.views, defaultAssets.server.allJS, defaultAssets.server.config), gulp.series('server-debug'))
        }else {
            gulp.watch(_.union(defaultAssets.server.views, defaultAssets.server.allJS, defaultAssets.server.config), gulp.series('server'))
        }
    }
    done();
});

// ESLint JS linting task
gulp.task('lint', function () {
    let assets = _.union(
        defaultAssets.server.gulpConfig,
        defaultAssets.server.allJS
    );

    return gulp.src(assets)
        .pipe(plugins.eslint())
        .pipe(plugins.eslint.format())
        .pipe(plugins.eslint.failOnError());
});

// Mocha tests task
gulp.task('mocha', function (done) {
    // Open mongoose connections
    let mongoose = require('./config/lib/mongoose.js');
    let error;

    // Connect mongoose
    mongoose.connect(function () {
        mongoose.loadModels();
        // Run the tests
        gulp.src(testAssets.tests.server)
            .pipe(plugins.mocha({
                reporter: 'spec',
                timeout: 10000
            }))
            .on('error', function (err) {
                // If an error occurs, save it
                error = err;
            })
            .on('end', function () {
                // When the tests are done, disconnect mongoose and pass the error state back to gulp
                mongoose.disconnect(function () {
                    done(error);
                });
            });
    });

});

// Karma test runner task
gulp.task('karma', function (done) {
    return gulp.src([])
        .pipe(plugins.karma({
            configFile: 'karma.conf.js',
            action: 'run',
            singleRun: true
        }));
});

// Drops the MongoDB database, used in e2e testing
gulp.task('dropdb', function (done) {
    // Use mongoose configuration
    let mongoose = require('./config/lib/mongoose.js');

    mongoose.connect(function (db) {
        db.connection.db.dropDatabase(function (err) {
            if(err) {
                console.log(err);
            } else {
                console.log('Successfully dropped db: ', db.connection.db.databaseName);
            }
            db.connection.db.close(done);
        });
    });
});

// Downloads the selenium webdriver
gulp.task('webdriver_update', webdriver_update);

// Start the standalone selenium server
// NOTE: This is not needed if you reference the
// seleniumServerJar in your protractor.conf.js
gulp.task('webdriver_standalone', webdriver_standalone);

// Protractor test runner task
gulp.task('protractor', gulp.series('webdriver_update', function () {
    gulp.src([])
        .pipe(protractor({
            configFile: 'protractor.conf.js'
        }))
        .on('end', function () {
            console.log('E2E Testing complete');
            // exit with success.
            process.exit(0);
        })
        .on('error', function (err) {
            console.log('E2E Tests failed');
            process.exit(1);
        });
}));

// runSequence('env:test', 'lint', 'mocha', done);
gulp.task('test:server', gulp.series(
    'env:test',
    'debug:false',
    'lint',
    'mocha'
));

// Run the project in development mode
gulp.task('default', gulp.series(
    'env:dev',
    'debug:false',
    'lint',
    gulp.parallel('server', 'watch')
));

// Run the project in debug mode
// runSequence('env:dev', 'lint', ['server', 'watch'], done);
gulp.task('debug', gulp.series(
    'env:dev',
    'debug:true',
    'lint',
    gulp.parallel('server-debug', 'watch')
));

// Run the project in production mode
// runSequence('templatecache', 'build', 'env:prod', 'lint', ['server', 'watch'], done);
gulp.task('prod', gulp.series(
    'env:prod',
    'debug:false',
    'lint',
    gulp.parallel('server', 'watch')
));
