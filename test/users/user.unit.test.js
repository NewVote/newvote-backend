process.env.NODE_ENV = 'test';

let mongoose = require('mongoose');
let User = mongoose.model('User');

// Dependencies
let chai = require('chai');
let should = chai.should();

describe('User', () => {
    beforeEach((done) => {
        User.deleteMany({}, (err) => {
            done();
        })
    })
});

describe('Save', function () {
    before(function (done) {

        let newUser = {
            firstName: 'testuser-1',
            lastName: '',
            displayName: 'testuser',
            email: 'testuser1@testuser.com',
            username: 'testuser1@testuser.com',
            verified: 'true',
            password: 'test123'
        }
        let user = new User(newUser);
        user.save((err) => done());
    });

    after(function (done) {
        User.deleteMany({}, (err) => {
            done();
        });
    })
    
    it('Should have one User', () => {
        return User.find({})
            .then((users) => {
                users.should.be.an('array');
                users.length.should.equal(1);            
            })
    })
})