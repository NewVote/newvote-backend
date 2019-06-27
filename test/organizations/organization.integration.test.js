process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../test.js');
const _ = require('lodash');
const dummy = require('mongoose-dummy');

const mongoose = require('mongoose');
const Organization = mongoose.model('Organization');
const User = mongoose.model('User');

chai.use(chaiHttp);
const recaptchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const users = {
    user: 'test_user@test.com',
    admin: 'test_admin@test.com',
    unverified: 'test_unverified@test.com',
    endorser: 'test_endorser@test.com'
}

const { user, admin, unverified, endorser } = users;

const userLogin = function (request, username) {

    const loginObject = {
        'username': `${username}`,
        'password': 'test123',
        'recaptchaResponse': recaptchaKey
    }

    return request
            .post('/api/auth/signin')
            .type('form')
            .send(loginObject)
            .then((res) => res)
            .catch((err) => err);
}

const userSignup = function () {   
    return chai.request(server)
            .post('/api/auth/signup')
            .type('form')
            .send({
                'email': 'test_newuser@test.com',
                'password': 'test123',
                'recaptchaResponse': recaptchaKey
            })
            .then((res)=> res)
            .catch((err) => err);
}

const generateOrg = function (model, ignoredFields) {
    return dummy(model, {
        ignore: ignoredFields ? ignoredFields : '',
        returnDate: true
    })
}

describe('/api/organizations GET routes', async function () {
    
    it('unauthenticated user cannot request organizations', function (done) {
        chai.request(server)
            .get('/api/organizations')
            .end(function (err, res) {
                res.should.have.status(401);
                res.body.should.be.an('object');
                res.body.should.have.property('message');
                done();
            })
    })
    
    it('admin can request  organizations', async function () {
        const request = chai.request(server).keepOpen();
        const login = await userLogin(request, user);
        const authToken = login.body.token;

        const res = await chai.request(server)
            .get('/api/organizations')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200);
        return res.body.should.be.a('array');
    })
})

describe('/api/organizations POST routes', async function () {

    const newOrg = {
        'name': 'Test Org',
        'description': 'It\'s a test org',
        'longDescription': 'Slightly longer description',
        'url': 'test',
        'imageUrl': 'test.jpg',
        'iconUrl': 'icon-test.jpg'
    };

    it('POST request from guest should be rejected', async function () {
        const res = await chai.request(server)
            .post('/api/organizations')
            .type('form')
            .send(newOrg);

        res.should.not.have.status(200);
        res.should.have.status(401);
        res.body.should.be.an('object');
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const request = chai.request(server).keepOpen();
        
        const login = await userLogin(request, user);
        const authToken = login.body.token;

        const res = await request
            .post('/api/organizations')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newOrg)

        request.close();
        res.should.have.status(403);
        return res.body.should.have.a.property('message');
        
    })

    // it('POST request from admin is accepted', async function () {
    //     const request = chai.request(server).keepOpen();
        
    //     const login = await userLogin(request, admin);
    //     const authToken = login.body.token;

    //     const signin = await request
    //         .post('/api/organizations')
    //         .set({ authorization: `Bearer ${authToken}` })
    //         .type('form')
    //         .send(newOrg)
    //         .then(function (res) {
    //             res.should.have.status(200);
    //             res.body.should.be.a('object');
    //             return request.close();
    //         })
    //         .catch((err) => err);
    // })
});

describe('/api/organizations/:organizationId GET', async function () {

    let orgId;
    // for routes that require authentication
    const request = chai.request(server).keepOpen();

    // Get initial org id for requests 
    before(async function () {
        return Organization.find({})
            .then((orgs) => {
                orgId = orgs[0]._id
            })
    })
    
    it('unauthenticated user cannot request single organization', async function () {
        const res = await chai.request(server)
            .get(`/api/organizations/${orgId}`)
        
        res.should.have.status(401);
        res.body.should.be.an('object');
        return res.body.should.have.property('message');
    })
    
    it('unverfied user can request single organization', async function () {
        const login = await userLogin(request, unverified);
        const authToken = login.body.token;

        const res = await chai.request(server)
            .get(`/api/organizations/${orgId}`)
            .set({ authorization: `Bearer ${authToken}` })
        
        res.should.have.status(200);
        res.body.should.be.an('object');
        res.body.should.have.property('name');
        return res.body.should.have.property('url');
    })

    it('user can request single organization', async function () {
        const login = await userLogin(request, user);
        const authToken = login.body.token;

        const res = await chai.request(server)
            .get(`/api/organizations/${orgId}`)
            .set({ authorization: `Bearer ${authToken}` })
        
        res.should.have.status(200);
        res.body.should.be.an('object');
        res.body.should.have.property('name');
        return res.body.should.have.property('url');
    })

    
    it('admin can request single organization', async function () {
        const login = await userLogin(request, admin);
        const authToken = login.body.token;

        const res = await chai.request(server)
            .get(`/api/organizations/${orgId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200);
        res.body.should.be.an('object');
        res.body.should.have.property('name');
        return res.body.should.have.property('url');
    })
})

describe('/api/organizations/:organizationId PUT', async function () {
    
    let orgId;
    let orgImageUrl;
    // for routes that require authentication
    const request = chai.request(server).keepOpen();

    // // Get initial org id for requests and image
    before(async function () {
        return Organization.find({})
            .then((orgs) => {
                orgId = orgs[0]._id;
                return orgImageUrl = orgs[0].imageUrl;
            });
    })

    // Reset the original organization after each test
    afterEach(async function () {
        return Organization.findOne({ _id: orgId })
            .then((doc) => {

                if (doc.imageUrl === orgImageUrl) return false;
                doc.imageUrl = orgImageUrl;
                return doc.save()
            })
    })

    it('unauthenticated user cannot update Organization', async function () {
        // Get a copy of the original organization
        const oldOrg = await Organization.findOne({ _id: orgId });
        const alteredOrg =  _.assign({}, oldOrg, { imageUrl: 'changed.jpg' });

        const res = await chai.request(server)
            .put(`/api/organizations/${orgId}`)
            .send(alteredOrg)

        res.should.have.status(401);
        res.body.should.be.an('object');
        res.body.should.have.property('message');

        // Second test to make sure DB has not been updated
        const newDbOrg = await Organization.findOne({ _id: orgId })
        newDbOrg.should.have.property('imageUrl');
        return newDbOrg.imageUrl.should.not.equal(alteredOrg.imageUrl);   
    });
    
    it('authenticated user cannot update Organization', async function () {
        const login = await userLogin(request, user);
        const authToken = login.body.token;

         // Get a copy of the original organization
         const oldOrg = await Organization.findOne({ _id: orgId });
         const alteredOrg =  _.assign({}, oldOrg, { imageUrl: 'changed.jpg' });

        const res = await chai.request(server)
            .put(`/api/organizations/${orgId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredOrg)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403);
        res.body.should.be.an('object');
        res.body.should.have.property('message');

        // Second test to make sure DB has not been updated
        const newDbOrg = await Organization.findOne({ _id: orgId })
        newDbOrg.should.have.property('imageUrl');
        return newDbOrg.imageUrl.should.not.equal(alteredOrg.imageUrl);  
    })

    it('admin can update organizations', async function () {
        const login = await userLogin(request, admin);
        const authToken = login.body.token;

        // Get a copy of the original organization
        const oldOrg = await Organization.findOne({ _id: orgId });

        let alteredOrg =  _.merge(oldOrg, { imageUrl: 'changed.jpg' });
        const res = await chai.request(server)
            .put(`/api/organizations/${orgId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredOrg)
            
        res.should.have.status(200);
        res.body.should.be.an('object');
        res.body.should.have.property('imageUrl');
        res.body.imageUrl.should.equal(alteredOrg.imageUrl);

        // Second test to make sure DB has not been updated
        const newDbOrg = await Organization.findOne({ _id: orgId })
        newDbOrg.should.have.property('imageUrl');
        return newDbOrg.imageUrl.should.equal(alteredOrg.imageUrl); 
    })
})

describe('/api/organizations/:organizationId DELETE', async function () {

    let originalOrg;
    // for routes that require authentication
    const request = chai.request(server).keepOpen();

    before(async function () {
        // Cannot resave org - so generate a new org which will be deleted
        let newOrg = new Organization(generateOrg(Organization));
        originalOrg = _.cloneDeep(newOrg);
        newOrg.save()
    })

    // Reset the original organization after each test
    afterEach(async function () {
        await Organization.findOne({ _id: originalOrg._id })
            .then((doc) => {
                if (doc) return false;
                // If doc is deleted replace so not to break future tests
                let newOrg = new Organization(generateOrg(Organization));
                originalOrg = doc;
                return newOrg.save()
            })
    })

    after(async function () {
        request.close();
        // If organization persists remove it
        if (originalOrg && originalOrg._id) {
            Organization.findOneAndRemove({ _id: originalOrg._id })
        }
    })
    
    it('unauthenticated user cannot delete Organization', async function () {
        console.log(originalOrg, 'this is org');
        const res = await chai.request(server)
            .delete(`/api/organizations/${originalOrg._id}`)

        res.should.have.status(401);
        res.body.should.be.an('object');
        res.body.should.have.property('message');

        // Second test to make sure DB has not been updated
        const orgExists = await Organization.findOne({ _id: originalOrg._id });
        orgExists.should.exist;
        orgExists.should.be.an('object');
        return orgExists.should.have.property('url')
    });
    
    it('authenticated user cannot delete Organization', async function () {
        const login = await userLogin(request, user);
        const authToken = login.body.token;
        
        const res = await chai.request(server)
            .delete(`/api/organizations/${originalOrg._id}`)
            .set({ authorization: `Bearer ${authToken}` })


        res.should.have.status(403);
        res.body.should.be.an('object');
        res.body.should.have.property('message');

        // Second test to make sure DB has not been updated
        const orgExists = await Organization.findOne({ _id: originalOrg._id });
        orgExists.should.exist;
        orgExists.should.be.an('object');
        return orgExists.should.have.property('url')
    });

    it('admin can delete Organization', async function () {
        const login = await userLogin(request, admin);
        const authToken = login.body.token;
        
        const res = await chai.request(server)
            .delete(`/api/organizations/${originalOrg._id}`)
            .set({ authorization: `Bearer ${authToken}` })


        res.should.have.status(200);
        // Second test to make sure DB has not been updated
        return Organization.findOne({ _id: originalOrg._id })
            .then((doc) => {
                return (doc === null).should.be.true;
            })
    });
})