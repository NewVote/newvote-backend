process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../test.js');

let mongoose = require('mongoose');
let User = mongoose.model('User');

// https://developers.google.com/recaptcha/docs/faq - need for automated tests to pass
let recaptchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

chai.use(chaiHttp);

// describe('User Authentication Flow', async function () {

//     after(async function () {
//         await User.deleteMany({})
//     })

//     it('User signup', async function () {
//         await chai.request(server)
//             .post('/api/auth/signup')
//             .type('form')
//             .send({
//                 'email': 'test@test.com',
//                 'password': 'test123',
//                 'recaptchaResponse': recaptchaKey
//             })
//             .then((res) => {
//                 res.should.have.status(200);
//                 res.body.should.be.an('object');
//                 res.body.should.have.property('token')
//                 res.body.should.have.property('user')
//             })
//     })

//     it('User signin', async function () {
//         await chai.request(server)
//             .post('/api/auth/signin')
//             .type('form')
//             .send({
//                 'username': 'test@test.com',
//                 'password': 'test123',
//                 'recaptchaResponse': recaptchaKey
//             })
//             .then((res) => {
//                 res.should.have.status(200);
//                 res.body.should.be.an('object');
//                 res.body.should.have.property('token')
//                 res.body.should.have.property('user')
//             })
//     })

//     it('User sms generation', async function () {
//         await chai.request(server)
//             .post('/api/users/sms')
//             .type('form')
//             .send({
//                 'number': '0000000000'
//             })
//             .then((res) => {
//                 res.body.should.not.have.property('message');
//             })
//     })

//     it('User sms verification', async function () {
//         await chai.request(server)
//             .post('/api/users/verify')
//             .type('form')
//             .send({
//                 'code': '419247'
//             })
//             .then((res) => {
//                 res.body.should.not.have.property('message');
//             })
//     })

//     it('User logout to end logged in session', async function () {
//         await chai.request(server)
//             .get('/api/auth/signout')
//             .then((res) => {
//                 res.body.should.have.property('message');
//             })
//     })
// })
