'use strict';

let nodemailer = require('nodemailer'),
    mongoose = require('mongoose'),
    chalk = require('chalk'),
    config = require('../config/config'),
    mg = require('../config/lib/mongoose');

let transporter = nodemailer.createTransport(config.mailer.options);
let link = 'reset link here'; // PUT reset link here
let email = {
    from: config.mailer.from,
    subject: 'Security update'
};
let text = [
    'Dear {{name}},',
    '\n',
    'We have updated our password storage systems to be more secure and more efficient, please click the link below to reset your password so you can login in the future.',
    link,
    '\n',
    'Thanks,',
    'The Team'
].join('\n');

mg.loadModels();

mg.connect(function (db) {
    let User = mongoose.model('User');

    User.find().exec(function (err, users) {
        if (err) {
            throw err;
        }

        let processedCount = 0,
            errorCount = 0;

        // report and exit if no users were found
        if (users.length === 0) {
            return reportAndExit(processedCount, errorCount);
        }

        for (let i = 0; i < users.length; i++) {
            sendEmail(users[i]);
        }

        function sendEmail(user) {
            email.to = user.email;
            email.text = email.html = text.replace('{{name}}', user.displayName);

            transporter.sendMail(email, emailCallback(user));
        }

        function emailCallback(user) {
            return function (err, info) {
                processedCount++;

                if (err) {
                    errorCount++;

                    if (config.mailer.options.debug) {
                        console.log('Error: ', err);
                    }
                    console.error('[' + processedCount + '/' + users.length + '] ' + chalk.red('Could not send email for ' + user.displayName));
                } else {
                    console.log('[' + processedCount + '/' + users.length + '] Sent reset password email for ' + user.displayName);
                }

                if (processedCount === users.length) {
                    return reportAndExit(processedCount, errorCount);
                }
            };
        }

        // report the processing results and exit
        function reportAndExit(processedCount, errorCount) {
            let successCount = processedCount - errorCount;

            console.log();

            if (processedCount === 0) {
                console.log(chalk.yellow('No users were found.'));
            } else {
                let alert = (!errorCount) ? chalk.green : ((successCount / processedCount) < 0.8) ? chalk.red : chalk.yellow;

                console.log(alert('Sent ' + successCount + ' of ' + processedCount + ' emails successfully.'));
            }

            process.exit(0);
        }
    });
});
