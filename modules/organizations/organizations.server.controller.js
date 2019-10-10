'use strict';

/**
 * Module dependencies.
 */
const path = require('path'),
    config = require(path.resolve('./config/config')),
    mongoose = require('mongoose'),
    Organization = mongoose.model('Organization'),
    votes = require('../votes/votes.server.controller'),
    Solution = mongoose.model('Solution'),
    Topic = mongoose.model('Topic'),
    Issue = mongoose.model('Issue'),
    Suggestion = mongoose.model('Suggestion'),
    Proposal = mongoose.model('Proposal'),
    User = mongoose.model('User'),
    FutureLeader = mongoose.model('FutureLeader'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash'),
    nodemailer = require('nodemailer'),
    transporter = nodemailer.createTransport(config.mailer.options),
    TopicController = require('../topics/topics.server.controller'),
    IssueController = require('../issues/issues.server.controller'),
    SolutionController = require('../solutions/solutions.server.controller'),
    ProposalController = require('../proposals/proposals.server.controller'),
    SuggestionController = require('../suggestions/suggestions.server.controller');

/**
 * Create a organization
 */
exports.create = function (req, res) {
    let organization = new Organization(req.body);
    let userPromise;
    organization.user = req.user;

    let email;
    const {
        moderators
    } = req.body;

    if (req.body.owner) {
        email = req.body.owner.email;
    } else if (req.body.newLeaderEmail) {
        email = req.body.newLeaderEmail;
    } else {
        email = null;
    }

    const createOrg = findUserAndOrganization(email, moderators)
        .then(promises => {
            let [user, futureLeader, moderators] = promises;

            if (user) {
                organization.owner = user;
                // can't see anywhere else where this happens, so push org to user orgs
                user.organizations.push(organization.id);
                // if there is a user, need to make sure that future leader does not exist
                // otherwise future leader will be created and email sent
                futureLeader = null;
                user.save();
            }

            if (moderators.length > 0) {
                const getObjectIds = moderators.map(mod => mod._id);
                organization.moderators = [...getObjectIds];
            }

            if (futureLeader) {
                organization.futureOwner = futureLeader;
                futureLeader.organizations.push(organization.id);
                futureLeader.save();
            }

            return organization;
        })
        .catch(err => {
            console.log(err);
        });

    return createOrg
        .then(seedNewOrganization)
        .then(promises => {
            if (!promises) throw 'Error Saving Seed Data';
            return organization.save();
        })
        .then(savedOrganization => {
            if (!savedOrganization) throw 'Error saving organization';

            if (savedOrganization.futureOwner) {
                sendVerificationCodeViaEmail(
                    req,
                    savedOrganization.futureOwner
                );
            }

            return res.json(organization);
        })
        .catch(err => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        });
};

/**
 * Show the current organization
 */
exports.read = function (req, res) {
    res.json(req.organization);
};

/**
 * Update a organization
 */
exports.update = function (req, res) {
    let unsavedEmails;
    let moderatorArray = req.body.moderators;

    delete req.body.moderators;
    delete req.body.moderatorsControl;

    delete req.body._id;
    delete req.body.__v;

    // if a user is chosen from existing users then future owner has to be removed
    if (req.body.owner) {
        req.body.futureOwner = null;
    }

    const {
        emailArray,
        emailIdArray
    } = filterEmails(moderatorArray);

    const orgPromise = Organization.findOne({
        _id: req.organization._id
    });
    const userEmailPromise = User.find()
        .or([{
            email: {
                $in: emailArray
            }
        }, {
            _id: {
                $in: emailIdArray
            }
        }]);

    Promise.all([orgPromise, userEmailPromise])
        .then(([org, emails]) => {
            let organization = _.assign(org, req.body);

            if (!emails.length) {
                organization.moderators = [];
                return organization.save();
            }
            organization.moderators = emails;
            unsavedEmails = compareEmailInputWithSavedEmails(emailArray, emails);
            return organization.save();
        })
        .then((organization) => {
            return Organization.populate(organization, {
                path: 'moderators'
            })
        })
        .then((organization) => {
            return res.status(200).json({
                organization,
                moderators: unsavedEmails
            });
        })
        .catch((err) => {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        })
};

/**
 * Delete an organization
 */
exports.delete = function (req, res) {
    let organization = req.organization;

    organization.remove(function (err) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.json(organization);
        }
    });
};

/**
 * List of Organizations
 */
exports.list = function (req, res) {
    let query = req.query.url ? {
        url: req.query.url
    } : {};
    let showDeleted = req.query.showDeleted || 'null';

    let showPrivateOrgs = req.query.showPrivate || 'false';
    let showNonPrivates = {
        $or: [{
            privateOrg: false
        }, {
            privateOrg: {
                $exists: false
            }
        }]
    };
    let privateMatch = showPrivateOrgs === 'true' ? {} : showNonPrivates;

    let showNonDeletedItemsMatch = {
        $or: [{
            softDeleted: false
        }, {
            softDeleted: {
                $exists: false
            }
        }]
    };
    let showAllItemsMatch = {};
    let softDeleteMatch = showDeleted ?
        showAllItemsMatch :
        showNonDeletedItemsMatch;

    Organization.aggregate([{
        $match: query
    },
    {
        $match: softDeleteMatch
    },
    {
        $match: privateMatch
    },
    {
        $sort: {
            name: 1
        }
    }
    ]).exec(function (err, organizations) {
        if (err) {
            return res.status(400).send({
                message: errorHandler.getErrorMessage(err)
            });
        }

        return res.json(organizations);
    });
};

/**
 * Organization middleware
 */
exports.organizationByID = function (req, res, next, id) {
    // Check whether an id is either an mongodb ObjectId or a url
    if (mongoose.Types.ObjectId.isValid(id)) {
        return Organization.findById(id)
            .populate('user', 'displayName')
            .populate('owner', '_id displayName firstName lastName email')
            .populate('moderators', '_id displayName firstName lastName email')
            .populate('futureOwner', '_id email')
            .then(organization => {
                if (!organization)
                    throw 'No organization with that identifier has been found';
                req.organization = organization;
                next();
            })
            .catch(err =>
                res
                    .status(404)
                    .send({
                        message: errorHandler.getErrorMessage(err)
                    })
            );
    }
    // check whether organization is a string it's a string url
    return Organization.findOne({
        url: id
    })
        .populate('user', 'displayName')
        .populate('owner', '_id displayName firstName lastName email')
        .populate('moderators', '_id displayName firstName lastName email')
        .populate('futureOwner', '_id email')
        .then(organization => {
            if (!organization)
                throw 'No organization with that identifier has been found';
            req.organization = organization;
            next();
        })
        .catch(err => {
            return res
                .status(404)
                .send({
                    message: errorHandler.getErrorMessage(err)
                });
        });

    // .exec(function (err, organization) {
    // 	if(err) return next(err);
    // 	if(!organization) {
    // 		return res.status(404)
    // 			.send({
    // 				message: 'No organization with that identifier has been found'
    // 			});
    // 	}
    // 	req.organization = organization;
    // 	next();
    // });

    // return res.status(400)
    // 	.send({
    // 		message: 'Organization is invalid'
    // 	});
};

exports.organizationByUrl = function (url) {
    if (!url) {
        return Promise.resolve(null);
    }

    let query = {
        url
    };

    return Organization.findOne(query)
        .populate('user', 'displayName')
        .populate('owner', '_id displayName firstName lastName email')
        .populate('moderators', '_id email')
        .exec();
};

function findUserAndOrganization(email, moderators) {
    let findUserPromise = User.findOne({
        email
    }).then(user => {
        if (!user) return false;
        return user;
    });

    const doesNewLeaderExist = FutureLeader.findOne({
        email
    }).then(leader => {
        // if leader exists then future leader is on the database
        // if leader does exist we want to return leader
        if (leader) {
            return leader;
        }

        if (!leader && email === null) {
            return false;
        }
        // if leader does not exist create a new leader
        const owner = new FutureLeader({
            email
        });
        return owner;
    });

    const findModerators = User.find({
        email: {
            $in: moderators
        }
    }).select({
        _id: 1
    });

    return Promise.all([findUserPromise, doesNewLeaderExist, findModerators]);
}

let buildMessage = function (code, req) {
    let messageString = '';
    let url = req.protocol + '://' + req.get('host') + '/auth/signup/' + code;

    messageString += `<h3> You have been invited to join NewVote </h3>`;
    messageString += `<p>To complete your account setup, just click the URL below or copy and paste it into your browser's address bar</p>`;
    messageString += `<p><a href='${url}'>${url}</a></p>`;

    return messageString;
};

let sendEmail = function (user, pass, req) {
    return transporter.sendMail({
        from: process.env.MAILER_FROM,
        to: user.email,
        subject: 'NewVote UQU Verification',
        html: buildMessage(pass, req)
    },
    (err, info) => {
        console.log(info, 'error sending email');
    }
    );
};

function saveEmailVerificationCode(user, code) {
    return FutureLeader.findById(user._id)
        .then(user => {
            if (!user) {
                throw Error(
                    'We could not find the user in the database. Please contact administration.'
                );
            }

            // Future leader may exist so no need to recreate code
            if (user.verificationCode) return user;

            //add hashed code to users model
            user.verificationCode = user.hashVerificationCode(code);

            //update user model
            return user.save();
        })
        .then(() => code);
}

function sendVerificationCodeViaEmail(req, user) {
    let pass$ = FutureLeader.generateRandomPassphrase();

    if (user.emailDelivered) return true;

    //send code via email
    return pass$
        .then(pass => saveEmailVerificationCode(user, pass))
        .then(pass => sendEmail(user, pass, req))
        .then(data => {
            console.log('Succesfully sent a verification e-mail: ', data);

            user.emailDelivered = true;
            user.save();

            return true;
        })
        .catch(err => {
            console.log('error sending verification email: ', err);
            throw 'There was a problem while sending your verification e-mail, please try again later.';
        });
}

function seedNewOrganization(org) {
    const {
        _id: organizationId
    } = org;

    const TopicPromise = Promise.resolve(
        TopicController.seedTopic(organizationId)
    );
    const IssuePromise = TopicPromise.then(topic => {
        return IssueController.seedData(organizationId, topic._id);
    });
    const SolutionPromise = IssuePromise.then(issue => {
        return SolutionController.seedData(organizationId, issue._id);
    });
    const ProposalPromise = SolutionPromise.then(solution => {
        return ProposalController.seedData(organizationId, solution._id);
    });
    const SuggestionPromise = SuggestionController.seedData(organizationId);

    return Promise.all([
        TopicPromise,
        IssuePromise,
        SolutionPromise,
        ProposalPromise,
        SuggestionPromise
    ]);
}

function filterEmails(emails) {

    if (!emails) {
        return {
            emailArray: false,
            emailIdArray: false
        };
    }

    const newModEmails = [];
    const modIDs = emails.slice().filter(e => {
        if (mongoose.Types.ObjectId.isValid(e)) return e;
        newModEmails.push(e);
        return false;
    });

    return {
        emailArray: newModEmails,
        emailIdArray: modIDs
    };
}

function compareEmailInputWithSavedEmails(userEmails, databaseEmails) {
    // userEmails is an array of strings
    // databaseEmails is an array of User objects with an email property

    const unsavedEmails = userEmails.slice().filter((email) => {
        return !databaseEmails.some((user) => {
            return user.email === email;
        })
    });

    return unsavedEmails;
}
