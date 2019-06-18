process.env.NODE_ENV = 'test';

require('./test.spec_helper.js');

let mongooseWrap = require('../config/lib/mongoose.js');
mongooseWrap.loadModels();
mongooseWrap.connect();

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
var path = require('path');
var config = require(path.resolve('./config/config'));
var server = require('../config/lib/express').init();
let chalk = require('chalk');
let should = chai.should();

let mongoose = require('mongoose');
let User = mongoose.model('User');

server.listen(3000);


var userFromSeedConfig = config.seedDB.options.seedUser;
var adminFromSeedConfig = config.seedDB.options.seedAdmin;

chai.use(chaiHttp);

// describe('do a test', function () {
//     it('should run a test', function (done) {
//         let user = new User({
//             username: 'brand new user',
//             password: 'new pass',
//             email: 'newemail@email.com'
//         })

//         user.save(function (err) {
//             console.log(err, 'this is user');

//         });

//         User.find({username: 'brand new user'})
//             .then(res => {
//                 console.log(res, 'this is res');
//             });
       
//     })
// })

describe('start', () => {
    it('should do a request', function (done) {
        this.timeout(10000);
        chai.request(server)
            .get('/api/issues')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            })
    })
})

describe('start', () => {
    it('should do a request', function (done) {
        this.timeout(10000);
        chai.request(server)
            .get('/api/solutions')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            })
    })
})

describe('start', () => {
    it('should do a request', function (done) {
        this.timeout(10000);
        chai.request(server)
            .get('/api/organizations')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            })
    })
})

describe('start', () => {
    it('should do a request', function (done) {
        this.timeout(10000);
        chai.request(server)
            .get('/api/suggestions')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            })
    })
})