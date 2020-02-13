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
        newReps
    } = req.body;

    const users = await User.find({
        email: {
            $in: newReps.map((rep) => rep.name)
        }
    })
        .select('displayName username _id roles email')

    // Compare users with the newReps array to find out which emails
    // were not valid.
    // Take those invalid emails, send them to the client
    const invalidReps = newReps.slice().filter((rep) => {
        const user = users.find((user) => {
            return user.email === rep.name;
        })
        return !user
    })

    if (!users.length) {
        return res.status(400)
            .send({
                message: "Invalid Email addresses"
            })
    }

    const userIds = users.map((user) => user._id)
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
            // Add the rep role to users
            if (!user.roles.includes('rep')) {
                user.roles.push('rep')
                user.save()
            }
            // Create and add new reps
            const newRep = {
                displayName: user.displayName || '',
                organizations: req.organization,
                owner: user._id,
                email: user.email,
                tags: newReps.find((rep) => rep.name === user.email).tags
            }

            const rep = new Rep(newRep)
            userArray.push(rep);
        })

    // create can take an array of objects
    Rep.create(userArray)
        .then((reps) => {
            // reps - newly created (add to client store)
            // invalidReps - failed to create (for client feedback)
            return res.json({ reps, invalidReps })
        })
        .catch((err) => {
            console.log(err, 'this is err')
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
    console.log(newRep, 'this is newRep')
    newRep.save()
        .then((rep) => {
            res.json(rep)
        })
        .catch((err) => {
            console.log(err, 'this is err')
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.updateMany = async function (req, res) {
    const { currentReps } = req.body
    const ids = currentReps.map((item) => item._id)
    const savedReps = await Rep.find({ _id: { $in: ids } })
    await savedReps.forEach((rep) => {
        const { tags } = currentReps.find((item) => rep._id.equals(item._id))
        rep.tags = tags
        return rep.save()
    })
        
    return res.json(savedReps)
    // .catch((err) => {
    //     return res.status(400)
    //         .send({
    //             message: errorHandler.getErrorMessage(err)
    //         })
    // })
    
}

exports.deleteMany = async function (req, res) {
    const repIds = req.body.slice().map((rep) => {
        return rep._id
    });
    // find the reps to be deleted, take the owner id and user
    // id to remove 'rep' role from user
    const userIds = req.body.slice().map((rep) => {
        return rep.owner._id || rep.owner
    });

    try {
        const reps = await Rep.find({ _id: { $in: repIds } })
        await Rep.deleteMany({ _id: { $in: repIds } })
        await User.find({ _id: { $in: userIds } })
            .then((users) => {
                users.forEach((user) => {
                    user.roles = user.roles.filter((role) => {
                        return role !== 'rep'
                    })
                    user.save()
                })
            })
        return res.json(reps);
    } catch (err) {
        return res.status(400)
            .send({
                message: errorHandler.getErrorMessage(err)
            })
    }
    
}

exports.delete = async function (req, res) {
    // console.log(req.body, 'this is req.body')
    let rep = req.rep
    rep.remove()
        .then((removedRep) => {
            return res.json(removedRep)
        })
        .catch((err) => {
            return res.status(400)
                .send({
                    message: errorHandler.getErrorMessage(err)
                })
        })
}

exports.list = async function (req, res) {
    Rep.find()
        .populate('proposals solutions issues')
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
    Rep.findById(id)
        .then((rep) => {
            if (!rep) {
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
