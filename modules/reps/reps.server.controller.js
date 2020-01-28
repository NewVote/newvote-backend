let mongoose = require('mongoose'),
    User = mongoose.model('User'),
    Rep = mongoose.model('Rep'),
    path = require('path'),
    errorHandler = require(path.resolve(
        './modules/core/errors.server.controller'
    )),
    _ = require('lodash');




exports.create = async function (req, res) {
    const { _id } = await User.findOne({ email: req.body.email })
    const newRep = Object.assign({}, req.body, {
        user: _id
    })
    const rep = new Rep(newRep);

    rep.save()
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
    const rep = await Rep.findOne({ _id: req.body._id })

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
