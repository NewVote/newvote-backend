const lib = require('messagemedia-messages-sdk');
const path = require('path');
const config = require(path.resolve('./config/config'));

lib.Configuration.basicAuthUserName = config.smsInternational.username;
lib.Configuration.basicAuthPassword = config.smsInternational.password;

function sendMessage (number, code) {
    var controller = lib.MessagesController;
    let body = new lib.SendMessagesRequest();
    body.messages = [];

    body.messages[0] = new lib.Message();
    body.messages[0].content = `Your NewVote verification code is ${code}`;
    body.messages[0].destinationNumber = number;

    return new Promise(function (resolve, reject) {
        controller.sendMessages(body, function(error, response, context) {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        })
    })
    .catch((err) => {
        console.log(err, 'catch err');
    })
}

function checkMessageStatus () {
    var controller = lib.DeliveryReportsController;

    return new Promise(function (resolve, reject) {
        controller.checkDeliveryReports(function(error, response, context) {
            if (error) {
                reject(error);
            } else {
                resolve(reponse);
            }
          });
    })
};




module.exports.sendMessage = sendMessage;

