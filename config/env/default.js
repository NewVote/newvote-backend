'use strict';

module.exports = {
	app: {
		title: 'NewVote',
		description: 'We’re building the bridge between an informed people and their leaders.',
		keywords: 'newvote',
		googleAnalyticsTrackingID: process.env.GOOGLE_ANALYTICS_TRACKING_ID || 'GOOGLE_ANALYTICS_TRACKING_ID'
	},
	port: process.env.PORT || 3000,
	node_env: process.env.NODE_ENVIRONMENT || 'development',
	templateEngine: 'ejs',
	// Session Cookie settings
	sessionCookie: {
		// session expiration is set by default to 24 hours
		maxAge: 24 * (60 * 60 * 1000),
		// httpOnly flag makes sure the cookie is only accessed
		// through the HTTP protocol and not JS/browser
		httpOnly: true,
		// secure cookie should be turned to true to provide additional
		// layer of security so that the cookie is set only when working
		// in HTTPS mode.
		secure: true
	},
	// sessionSecret should be changed for security measures and concerns
	sessionSecret: process.env.SESSION_SECRET || 'MEAN',
	jwtSecret: process.env.JWT_SECRET || 'JWTISBETTERTHANSESSION',
	jwtExpiry: '30d',
	jwtIssuer: 'https://rapid.aaf.edu.au',
	jwtAudience: 'https://newvote.org',
	// sessionKey is set to the generic sessionId key used by PHP applications
	// for obsecurity reasons
	sessionKey: 'sessionId',
	sessionCollection: 'sessions',
	logo: 'public/img/brand/logo.png',
	social: 'public/img/brand/social.png',
	favicon: 'public/img/brand/favicon.png',
	reCaptcha: {
		secret: process.env.RECAPTCHA_SECRET || ''
	},
	uploads: {
		profileUpload: {
			dest: './public/img/profile/uploads/', // Profile upload destination path
			limits: {
				fileSize: 1 * 1024 * 1024 // Max file size in bytes (1 MB)
			}
		}
	}
};
