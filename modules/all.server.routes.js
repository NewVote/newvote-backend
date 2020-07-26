'use strict'

/**
 * Module dependencies.
 */
let path = require('path'),
    config = require(path.resolve('./config/config')),
    policy = require('./generic.server.policy'),
    topics = require('./topics/topics.server.controller'),
    organizations = require('./organizations/organizations.server.controller'),
    futureLeaders = require('./future-leaders/future-leaders.server.controller'),
    issues = require('./issues/issues.server.controller'),
    solutions = require('./solutions/solutions.server.controller'),
    proposals = require('./proposals/proposals.server.controller'),
    suggestions = require('./suggestions/suggestions.server.controller'),
    media = require('./media/media.server.controller'),
    endorsement = require('./endorsement/endorsement.server.controller'),
    votes = require('./votes/votes.server.controller'),
    regions = require('./regions/regions.server.controller'),
    countries = require('./countries/countries.server.controller'),
    passport = require('passport'),
    jwt = require('express-jwt'),
    celebrateWrap = require('celebrate'),
    validators = require('./organizations/organization.validation.js')

const { schema } = validators
const { errors, celebrate } = celebrateWrap

// jwt module simply puts the user object into req.user if the token is valid
// otherwise it just does nothing and the policy module handles the rest
module.exports = function (app) {
    app.all('*', (req, res, next) => {
        // debugger
        // start wit the organization stored in the cookie and attempt to parse
        let organization = null
        const { organization: cookieOrg } = req.cookies
        // console.log(req.cookies, 'this is req.cookies on all routes')
        try {
            organization = JSON.parse(cookieOrg)
        } catch (e) {
            organization = null
        }
        // var { org:orgUrl } = req.cookies // prefer the redirect cookie url over header
        let orgUrl = req.cookies.org ? req.cookies.org : req.cookies.orgUrl // try "orgUrl" cookie instead of org if its undefined
        console.log(orgUrl, 'does orgUrl exist')
        if (!orgUrl) {
            // still no orgUrl so try getting org from the referer in the request
            try {
                let url = req.get('referer')
                url = url.replace(/(^\w+:|^)\/\//, '')
                const splitUrl = url.split('.')
                orgUrl = splitUrl[0]
            } catch (e) {
                // usually fails after a redirect which has no header
                console.error('No referer in header! Cannot look up an org')
            }
        }

        // clear the cookies as we dont need them anymore
        // res.clearCookie('orgUrl', { path: '/', domain: 'newvote.org' })
        // res.clearCookie('org', { path: '/', domain: 'newvote.org' })

        // try to use the full org object from the cookie first
        // make sure the url of the saved org matches the url of the page
        if (organization && organization.url === orgUrl) {
            req.organization = organization
            return next()
        } else {
            // either no cookie org or urls dont match so its outdated and we need to fetch org again
            organizations.organizationByUrl(orgUrl).then((organization) => {
                req.organization = organization
                res.cookie('organization', JSON.stringify(organization), {
                    domain: 'newvote.org',
                    secure: true,
                    overwrite: true,
                    sameSite: 'Strict',
                })
                return next()
            })
        }
    })
    const jwtConfig = {
        secret: config.jwtSecret,
        credentialsRequired: false,
        algorithms: ['RS256'],
    }
    app.route('/api/topics')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(topics.list)
        .post(topics.create)

    app.route('/api/issues')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(issues.list)
        .post(issues.create)

    app.route('/api/solutions')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(solutions.list)
        .post(solutions.create)

    app.route('/api/proposals')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(proposals.list)
        .post(proposals.create)

    app.route('/api/suggestions')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(suggestions.list)
        .post(suggestions.create)

    app.route('/api/endorsement')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(endorsement.list)
        .post(endorsement.create)

    app.route('/api/media')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(media.list)
        .post(media.create)

    app.route('/api/regions')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(regions.list)
        .post(regions.create)

    app.route('/api/countries')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(countries.list)

    app.route('/api/meta/:uri')
        // .all(jwt(jwtConfig), policy.isAllowed)
        .get(media.getMeta)

    // Single article routes
    app.route('/api/topics/:topicId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(topics.read)
        .put(topics.update)
        .delete(topics.delete)

    app.route('/api/organizations/owner/:organizationId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .put(futureLeaders.update)

    app.route('/api/issues/:issueId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(issues.read)
        .put(issues.update)
        .delete(issues.delete)

    app.route('/api/solutions/:solutionId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(solutions.read)
        .put(solutions.update)
        .delete(solutions.delete)

    app.route('/api/proposals/:proposalId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(proposals.read)
        .put(proposals.update)
        .delete(proposals.delete)

    app.route('/api/suggestions/:suggestionId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(suggestions.read)
        .put(suggestions.update)
        .delete(suggestions.delete)

    app.route('/api/endorsement/:endorsementId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(endorsement.read)
        .put(endorsement.update)
        .delete(endorsement.delete)

    app.route('/api/media/:mediaId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(media.read)
        .put(media.update)
        .delete(media.delete)

    app.route('/api/regions/:regionId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(regions.read)
        .put(regions.update)
        .delete(regions.delete)

    app.route('/api/countries/:countryId')
        .all(jwt(jwtConfig), policy.isAllowed)
        .get(countries.read)

    // Finish by binding the article middleware
    app.param('topicId', topics.topicByID)
    app.param('issueId', issues.issueByID)
    app.param('solutionId', solutions.solutionByID)
    app.param('proposalId', proposals.proposalByID)
    app.param('suggestionId', suggestions.suggestionByID)
    app.param('endorsementId', endorsement.endorsementByID)
    app.param('mediaId', media.mediaByID)
    app.param('regionId', regions.regionByID)
    app.param('countryId', countries.countryByID)
}
