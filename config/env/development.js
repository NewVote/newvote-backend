'use strict'

let defaultEnvConfig = require('./default')

module.exports = {
    db: {
        uri: 'mongodb://localhost:27017/newvote-uqu',
        options: {
            //   user: 'newvote-admin',
            //   pass: 'newvote2017'
        },
        // Enable mongoose debug mode
        debug: process.env.MONGODB_DEBUG || false,
    },
    secure: {
        ssl: false,
        privateKey: './config/local-sslcerts/key.pem',
        certificate: './config/local-sslcerts/cert.pem',
    },
    // Session Cookie settings
    sessionCookie: {
        // session expiration is set by default to 24 hours
        maxAge: 720 * (60 * 60 * 1000),
        // httpOnly flag makes sure the cookie is only accessed
        // through the HTTP protocol and not JS/browser
        httpOnly: false,
        // secure cookie should be turned to true to provide additional
        // layer of security so that the cookie is set only when working
        // in HTTPS mode.
        secure: false,
    },
    jwtIssuer: 'https://rapid.test.aaf.edu.au',
    log: {
        // logging with Morgan - https://github.com/expressjs/morgan
        // Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
        format: 'dev',
        options: {
            // Stream defaults to process.stdout
            // Uncomment/comment to toggle the logging to a log on the file system
            //stream: {
            //  directoryPath: process.cwd(),
            //  fileName: 'access.log',
            //  rotatingLogs: { // for more info on rotating logs - https://github.com/holidayextras/file-stream-rotator#usage
            //    active: false, // activate to use rotating logs
            //    fileName: 'access-%DATE%.log', // if rotating logs are active, this fileName setting will be used
            //    frequency: 'daily',
            //    verbose: false
            //  }
            //}
        },
    },
    app: {
        title: defaultEnvConfig.app.title + ' - Development Environment',
    },
    facebook: {
        clientID: process.env.FACEBOOK_ID || 'APP_ID',
        clientSecret: process.env.FACEBOOK_SECRET || 'APP_SECRET',
        callbackURL: '/api/auth/facebook/callback',
    },
    twitter: {
        clientID: process.env.TWITTER_KEY || 'CONSUMER_KEY',
        clientSecret: process.env.TWITTER_SECRET || 'CONSUMER_SECRET',
        callbackURL: '/api/auth/twitter/callback',
    },
    google: {
        clientID: process.env.GOOGLE_ID || 'APP_ID',
        clientSecret: process.env.GOOGLE_SECRET || 'APP_SECRET',
        callbackURL: '/api/auth/google/callback',
    },
    linkedin: {
        clientID: process.env.LINKEDIN_ID || 'APP_ID',
        clientSecret: process.env.LINKEDIN_SECRET || 'APP_SECRET',
        callbackURL: '/api/auth/linkedin/callback',
    },
    github: {
        clientID: process.env.GITHUB_ID || 'APP_ID',
        clientSecret: process.env.GITHUB_SECRET || 'APP_SECRET',
        callbackURL: '/api/auth/github/callback',
    },
    paypal: {
        clientID: process.env.PAYPAL_ID || 'CLIENT_ID',
        clientSecret: process.env.PAYPAL_SECRET || 'CLIENT_SECRET',
        callbackURL: '/api/auth/paypal/callback',
        sandbox: false,
    },
    mailer: {
        from: process.env.MAILER_FROM || 'MAILER_FROM',
        options: {
            service: process.env.MAILER_SERVICE_PROVIDER || 'mailjet',
            auth: {
                user: process.env.MAILER_USERNAME || 'MAILER_USERNAME',
                pass: process.env.MAILER_PASSWORD || 'MAILER_PASSWORD',
            },
        },
    },
    mailchimp: {
        api: process.env.MAILCHIMP_API_KEY || 'MAILCHIMP_API_KEY',
        list: process.env.MAILCHIMP_LIST_ID || 'MAILCHIMP_LIST_ID',
    },
    smsBroadcast: {
        username: process.env.SMS_USERNAME || '',
        password: process.env.SMS_PASSWORD || '',
    },
    reCaptcha: {
        secret: process.env.RECAPTCHA_SECRET || '',
    },
    twilio: {
        sid: process.env.TWILIO_TEST_SID || 'TWILIO_TEST_SID',
        token: process.env.TWILIO_TEST_TOKEN || 'TWILIO_TEST_TOKEN',
        number: process.env.TWILIO_TEST_NUMBER || 'TWILIO_TEST_NUMBER',
        serviceId:
            process.env.TWILIO_TEST_SERVICE_ID || 'TWILIO_LIVE_SERVICE_ID',
    },
    livereload: true,
    seedDB: {
        seed: process.env.MONGO_SEED === 'true' ? true : false,
        options: {
            logResults:
                process.env.MONGO_SEED_LOG_RESULTS === 'false' ? false : true,
            seedUser: {
                username: process.env.MONGO_SEED_USER_USERNAME || 'user',
                provider: 'local',
                email:
                    process.env.MONGO_SEED_USER_EMAIL || 'user@localhost.com',
                firstName: 'User',
                lastName: 'Local',
                displayName: 'User Local',
                roles: ['user'],
            },
            seedAdmin: {
                username: process.env.MONGO_SEED_ADMIN_USERNAME || 'admin',
                provider: 'local',
                email:
                    process.env.MONGO_SEED_ADMIN_EMAIL || 'admin@localhost.com',
                firstName: 'Admin',
                lastName: 'Local',
                displayName: 'Admin Local',
                roles: ['user', 'admin'],
            },
        },
    },
}
