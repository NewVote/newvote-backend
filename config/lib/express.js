'use strict'

/**
 * Module dependencies.
 */
let config = require('../config'),
    express = require('express'),
    httpsRedirect = require('express-https-redirect'),
    morgan = require('morgan'),
    logger = require('./logger'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    compress = require('compression'),
    methodOverride = require('method-override'),
    cookieParser = require('cookie-parser'),
    helmet = require('helmet'),
    path = require('path'),
    cors = require('cors'),
    celebrateWrap = require('celebrate'),
    csrf = require('csrf')

const { celebrate, errors } = celebrateWrap

/**
 * Initialize local variables
 */
// module.exports.initLocalVariables = function (app) {
//     // Setting application local variables
//     app.locals.title = config.app.title
//     app.locals.description = config.app.description
//     if (config.secure && config.secure.ssl === true) {
//         app.locals.secure = config.secure.ssl
//     }
//     app.locals.keywords = config.app.keywords
//     app.locals.googleAnalyticsTrackingID = config.app.googleAnalyticsTrackingID
//     app.locals.facebookAppId = config.facebook.clientID
//     app.locals.jsFiles = config.files.client.js
//     app.locals.cssFiles = config.files.client.css
//     app.locals.livereload = config.livereload
//     app.locals.logo = config.social
//     app.locals.user = false
//     app.locals.config = false
//     app.locals.isPrerender = false
//     app.locals.safeJSON = function (data) {
//         if (data) {
//             return JSON.stringify(data)
//         } else {
//             return 'false'
//         }
//     }

//     // Passing the request url to environment locals
//     app.use(function (req, res, next) {
//         res.locals.host = req.protocol + '://' + req.hostname
//         res.locals.url =
//             req.protocol + '://' + req.headers.host + req.originalUrl
//         next()
//     })
// }

/**
 * Initialize application middleware
 */
module.exports.initMiddleware = function (app) {
    // Showing stack errors
    app.set('showStackError', true)

    // Enable jsonp
    app.enable('jsonp callback')

    let corsOptions = {
        origin: /newvote.org$/,
        allowedHeaders: [
            'Content-Type, Authorization, Content-Length, X-Requested-With, x-xsrf-token',
        ],
        credentials: true,
    }
    app.use(cors(corsOptions))
    // enable pre-flight
    app.options('*', cors())

    // Should be placed before express.static
    app.use(
        compress({
            filter: function (req, res) {
                return /json|text|javascript|css|font|svg/.test(
                    res.getHeader('Content-Type'),
                )
            },
            level: 9,
        }),
    )

    // Enable logger (morgan)
    app.use(morgan(logger.getFormat(), logger.getOptions()))

    // // Environment dependent middleware
    // if (process.env.NODE_ENV === 'development') {
    //     // Disable views cache
    //     app.set('view cache', false)
    // } else if (process.env.NODE_ENV === 'production') {
    //     app.locals.cache = 'memory'
    // }

    // Request body parsing middleware should be above methodOverride
    app.use(
        bodyParser.urlencoded({
            extended: true,
        }),
    )
    app.use(bodyParser.json())
    app.use(methodOverride())

    // Add the cookie parser and flash middleware
    app.use(cookieParser())
    // app.set('trust proxy', 1)

    // set up csurf
    // app.use(
    //     csrf({
    //         cookie: {
    //             path: '/',
    //             domain: '.newvote.org',
    //             sameSite: 'Lax',
    //             httpOnly: false,
    //             expires: new Date(Date.now() + 60 * 60),
    //         },
    //     }),
    // )

    // app.use(function (req, res, next) {
    //     res.cookie('XSRF-TOKEN', req.csrfToken(), {
    //         domain: '.newvote.org',
    //         sameSite: 'Lax',
    //         httpOnly: false,
    //     })
    //     next()
    // })

    // https redirect
    if (process.env.NODE_ENV === 'production') {
        app.use('/', httpsRedirect())
    }
}

/**
 * Configure view engine
 */
// module.exports.initViewEngine = function (app) {
//     // Use the config file to set the server view engine

//     // Set views path and view engine
//     app.set('view engine', 'server.view.html')
//     app.set('views', './')
// }

/**
 * Configure Express session
 */
module.exports.initSession = function (app, db) {
    // Express MongoDB session storage
    app.use(
        session({
            // proxy: true,
            saveUninitialized: true,
            resave: true,
            secret: config.sessionSecret,
            unset: 'destroy',
            cookie: {
                maxAge: config.sessionCookie.maxAge,
                httpOnly: config.sessionCookie.httpOnly,
                secure: config.sessionCookie.secure && config.secure.ssl,
            },
            key: config.sessionKey,
            store: new MongoStore({
                mongooseConnection: db.connection,
                collection: config.sessionCollection,
                url: config.db.uri,
            }),
        }),
    )
}

/**
 * Invoke modules server configuration
 */
module.exports.initModulesConfiguration = function (app, db) {
    config.files.server.configs.forEach(function (configPath) {
        require(path.resolve(configPath))(app, db)
    })
}

/**
 * Configure Helmet headers configuration
 */
module.exports.initHelmetHeaders = function (app) {
    // Use helmet to secure Express headers
    let SIX_MONTHS = 15778476000
    app.use(helmet.frameguard())
    app.use(helmet.xssFilter())
    app.use(helmet.noSniff())
    app.use(helmet.ieNoOpen())
    app.use(
        helmet.hsts({
            maxAge: SIX_MONTHS,
            includeSubDomains: true,
            force: true,
        }),
    )
    app.disable('x-powered-by')
}

/**
 * Configure the modules static routes
 */
module.exports.initModulesClientRoutes = function (app) {
    // Setting the app router and static folder
    app.use('/', express.static(path.resolve('./public')))

    // Globbing static routing
    config.folders.client.forEach(function (staticPath) {
        app.use(staticPath, express.static(path.resolve('./' + staticPath)))
    })
}

/**
 * Configure the modules ACL policies
 */
module.exports.initModulesServerPolicies = function (app) {
    // Globbing policy files
    config.files.server.policies.forEach(function (policyPath) {
        require(path.resolve(policyPath)).invokeRolesPolicies()
    })
}

/**
 * Configure the modules server routes
 */
module.exports.initModulesServerRoutes = function (app) {
    // Globbing routing files
    config.files.server.routes.forEach(function (routePath) {
        require(path.resolve(routePath))(app)
    })
}

/**
 * Configure error handling
 */
module.exports.initErrorRoutes = function (app) {
    // populate with general error handler or pass joi errors to next
    app.use(function (err, req, res, next) {
        console.log(err, 'this is err')
        if (err.joi) {
            return next(err)
        }
        return res.status(500).json({
            message: 'Server error',
        })
    })

    app.use(errors())

    // app.use(function (err, req, res, next) {
    // 	// If the error object doesn't exists
    // 	if(!err) {
    // 		return next();
    // 	}

    // 	// Log it
    // 	console.error(err.stack);

    // 	// Redirect to error page
    // 	res.redirect('/server-error');
    // });
}

/**
 * Configure Socket.io
 */
module.exports.configureSocketIO = function (app, db) {
    // Load the Socket.io configuration
    let server = require('./socket.io')(app, db)

    // Return server object
    return server
}

/**
 * Initialize the Express application
 */
module.exports.init = function (db) {
    // Initialize express app
    let app = express()

    // Initialize local variables
    // this.initLocalVariables(app)

    // Initialize Express middleware
    this.initMiddleware(app)

    // Initialize Express view engine
    // this.initViewEngine(app);

    // Initialize Express session
    // Replaced session with JWT
    this.initSession(app, db)

    // Initialize Modules configuration
    this.initModulesConfiguration(app)

    // Initialize Helmet security headers
    this.initHelmetHeaders(app)

    // Initialize modules static client routes
    // this.initModulesClientRoutes(app);

    // Initialize modules server authorization policies
    this.initModulesServerPolicies(app)

    // Initialize modules server routes
    this.initModulesServerRoutes(app)

    // Initialize error routes
    this.initErrorRoutes(app)

    // Configure Socket.io
    app = this.configureSocketIO(app, db)

    return app
}
