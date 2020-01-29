let mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Rep = mongoose.model('Rep'),
    path = require('path'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash');


exports.create = async function (req, res) {
    const {
        newReps,
        currentReps
    } = req.body;

    // TODO - 
    // 1) Remove duplicate entries in the newReps array
    // 2) remove entries which don't conform to being an email
    // 3) if a user in the users array is also in the CurrentReps array remove from users array (no need for duplicates)

    // let currentRepIds = currentReps.map((rep) => {
    //     return rep._id;
    // });

    // const reps = await Rep.find({
    //     _id: {
    //         $in: currentRepIds
    //     }
    // })

    // Find existing users in database based on an array of emails
    const users = await User.find({
        email: {
            $in: newReps
        }
    })
        .select('displayName username _id')

    if (!users.length) {
        return res.status(400)
            .send({
                message: "Invalid Email addresses"
            })
    }

    // check if any of the user Ids from users are present in the Reps Collections
    let userIds = users.map((user) => {
        return user._id;
    })

    const reps = await Rep.find({ owner: { $in: userIds } })
        .and([{ organizations: req.organization }])


    let userArray = [];
    // Check that the user id's do not exist in the Reps collection under owner
    users.filter((user) => {
        if (!reps.length) return true
        // is user a current rep
        return !reps.some((rep) => {
            return user._id.equals(rep.owner)
        })
    })
        // create an array of "Reps" to then save to database
        .forEach((user) => {
            console.log(user, 'this is forEach');
            const newRep = {
                displayName: user.username,
                organizations: req.organization,
                owner: user._id
            }

            const rep = new Rep(newRep)
            userArray.push(rep);
        })

    // create can take an array of objects
    Rep.create(userArray)
        .then((rep) => {
            return res.json(rep)
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.read = async function (req, res) {
    return res.json(req.rep)
}

exports.update = async function (req, res) {
    const rep = await Rep.findOne({
        _id: req.body._id
    })

    const newRep = _.assign(rep, req.body);
    newRep.save()
        .then((rep) => {
            res.json(rep)
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.delete = async function (req, res) {
    let rep = req.rep
    rep.remove()
        .then((removedRep) => {
            return res.json(removedRep)
        })
}

exports.list = async function (req, res) {
    Rep.find()
        .then((reps) => {
            return res.json(reps);
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.repByID = async function (req, res, next, id) {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return Rep.findOne({
            slug: id
        })
            .then((rep) => {
                if (!rep) throw ('Issue does not exist');

                req.rep = rep;
                next();
            })
            .catch((err) => {
                return res.status(400).send({
                    message: err
                });
            })
    }

    Rep.findById(id)
        .exec(function (err, rep) {
            if (err) {
                return next(err);
            } else if (!rep) {
                return res.status(404).send({
                    message: 'No rep with that identifier has been found'
                });
            }
            req.rep = rep;
            next();
        })
        .catch((err) => {
            return res.status(400).send({
                message: err
            });
        })
};
