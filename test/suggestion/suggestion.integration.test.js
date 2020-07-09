process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Suggestion = mongoose.model('Suggestion')
const User = mongoose.model('User')
const Organization = mongoose.model('Organization')

chai.use(chaiHttp)
const recaptchaKey = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

const users = {
    user: 'test_user@test.com',
    admin: 'test_admin@test.com',
    unverified: 'test_unverified@test.com',
    endorser: 'test_endorser@test.com',
}

const { user, admin, unverified, endorser } = users

const userLogin = function (request, username) {
    const loginObject = {
        username: `${username}`,
        password: 'test123',
        recaptchaResponse: recaptchaKey,
    }

    return request
        .post('/api/auth/signin')
        .type('form')
        .send(loginObject)
        .then((res) => res)
        .catch((err) => err)
}

const generateDoc = function (model, ignoredFields) {
    return dummy(model, {
        ignore: ignoredFields ? ignoredFields : '',
        returnDate: true,
    })
}

describe('/api/suggestions GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request suggestions', async function () {
        const res = await chai.request(server).get('/api/suggestions')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request suggestions', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/suggestions')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/suggestions POST routes', async function () {
    const request = chai.request(server).keepOpen()
    const ignoredFields = [
        'user',
        'parent',
        'parentType',
        'organizations',
        '_id',
    ]
    let newSuggestion
    let savedOrg

    before(async function () {
        // Assign existing org to suggestion or POST fails server side
        return await Organization.find({}).then((orgs) => {
            let doc = generateDoc(Suggestion, ignoredFields)
            // _id
            doc.organizations = JSON.parse(JSON.stringify(orgs[0]))
            newSuggestion = doc
            savedOrg = orgs[0]
        })
    })

    afterEach(async function () {
        Suggestion.findByIdAndDelete(newSuggestion._id).then((res) => {
            if (!res) return false
            newSuggestion = generateDoc(Suggestion)
            newSuggestion.organizations = savedOrg
        })
    })

    after(async function () {
        request.close()
        return Suggestion.findByIdAndDelete(newSuggestion._id)
    })

    // if('POST request fails if there is no organization on suggestion', async function () {

    // })

    // if('POST request is accepted if there is an organization but no owner', async function () {
    //     return false;
    // })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/suggestions')
            .type('form')
            .send(newSuggestion)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from unverfied user should be rejected', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await request
            .post('/api/suggestions')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newSuggestion)

        res.should.not.have.status(200)
        res.should.have.status(403)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user accepted', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/suggestions')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newSuggestion)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSuggestion.title)
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/suggestions')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newSuggestion)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSuggestion.title)
    })
})

/* SINGLE ROUTES TOPICS */

describe('/api/suggestions/:suggestionId GET', async function () {
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    const ignoredFields = ['user', 'parent', 'parentType', 'organizations']
    let suggestionId
    let newSuggestion

    before(async function () {
        // Assign existing org to suggestion or POST fails server side
        return await Organization.find({}).then((orgs) => {
            let doc = generateDoc(Suggestion, ignoredFields)
            doc.organizations = JSON.parse(JSON.stringify(orgs[0]))
            suggestionId = doc._id
            newSuggestion = doc
            return Suggestion.create(doc)
        })
    })

    after(async function () {
        request.close()
        return await Suggestion.findByIdAndDelete(suggestionId)
    })

    it('unauthenticated user cannot request single suggestion', async function () {
        const res = await chai
            .request(server)
            .get(`/api/suggestions/${suggestionId}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single suggestion', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/suggestions/${suggestionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSuggestion.title)
    })

    it('user can request single suggestion', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/suggestions/${suggestionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSuggestion.title)
    })

    it('admin can request single suggestion', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/suggestions/${suggestionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSuggestion.title)
    })
})

describe('/api/suggestions/:suggestionId PUT', async function () {
    const ignoredFields = ['user', 'parent', 'parentType', 'organizations']

    let suggestionId
    let newSuggestion

    const request = chai.request(server).keepOpen()

    before(async function () {
        return await Organization.find({}).then((orgs) => {
            let doc = generateDoc(Suggestion, ignoredFields)
            // _id
            doc.organizations = JSON.parse(JSON.stringify(orgs[0]))
            newSuggestion = doc
            suggestionId = doc._id
            return Suggestion.create(newSuggestion)
        })
    })

    // Reset the original suggestion after each test
    afterEach(async function () {
        return await Suggestion.findOne({ _id: suggestionId }).then((doc) => {
            if (doc.description === newSuggestion.description) return false
            doc.description = newSuggestion.description
            return doc.save()
        })
    })

    after(async function () {
        request.close()
        return await Suggestion.findByIdAndDelete(suggestionId)
    })

    it('unauthenticated user cannot update Suggestion', async function () {
        const alteredSuggestion = _.assign({}, newSuggestion, {
            description: 'changed.jpg',
        })

        const res = await chai
            .request(server)
            .put(`/api/suggestions/${suggestionId}`)
            .send(alteredSuggestion)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbSuggestion = await Suggestion.findOne({ _id: suggestionId })
        newDbSuggestion.should.have.property('description')
        return newDbSuggestion.description.should.not.equal(
            alteredSuggestion.description,
        )
    })

    // it('authenticated user can update Suggestion', async function () {
    //     const login = await userLogin(request, user);
    //     const authToken = login.body.token;

    //     const alteredSuggestion =  _.assign({}, newSuggestion, { description: 'changed.jpg' });

    //     const res = await chai.request(server)
    //         .put(`/api/suggestions/${suggestionId}`)
    //         .set({ authorization: `Bearer ${authToken}` })
    //         .send(alteredSuggestion)

    //     // Error is passed up to express error handlers - Needs updating
    //     res.should.have.status(200);
    //     res.body.should.be.an('object');
    //     res.body.should.have.property('description');

    //     // Second test to make sure DB has not been updated
    //     const newDbSuggestion = await Suggestion.findOne({ _id: suggestionId })
    //     newDbSuggestion.should.have.property('description');
    //     return newDbSuggestion.description.should.equal(alteredSuggestion.description);
    // })

    it('admin can update suggestions', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredSuggestion = _.assign({}, newSuggestion, {
            description: 'changed.jpg',
        })
        const res = await chai
            .request(server)
            .put(`/api/suggestions/${suggestionId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredSuggestion)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('description')
        res.body.description.should.equal(alteredSuggestion.description)

        // Second test to make sure DB has not been updated
        const newDbSuggestion = await Suggestion.findOne({ _id: suggestionId })
        newDbSuggestion.should.have.property('description')
        return newDbSuggestion.description.should.equal(
            alteredSuggestion.description,
        )
    })
})

describe('/api/suggestions/:suggestionId DELETE', async function () {
    const ignoredFields = ['user', 'parent', 'parentType', 'organizations']

    let originalSuggestion
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    before(async function () {
        // Assign existing org to suggestion or POST fails server side
        return await Organization.find({}).then((orgs) => {
            let doc = generateDoc(Suggestion, ignoredFields)
            doc.organizations = JSON.parse(JSON.stringify(orgs[0]))
            originalSuggestion = doc
            return Suggestion.create(doc)
        })
    })

    // Reset the original Suggestion after each test
    afterEach(async function () {
        await Suggestion.findOne({ _id: originalSuggestion._id })
            .then((doc) => {
                if (doc) return false
                // If doc is deleted replace so not to break future tests
                let newSuggestion = new Suggestion(generateDoc(Suggestion))

                return newSuggestion.save()
            })
            .then((doc) => {
                if (!doc) return false
                originalSuggestion = doc
            })
    })

    after(async function () {
        request.close()
        // If suggestion persists remove it
        if (originalSuggestion && originalSuggestion._id) {
            return Suggestion.findOneAndRemove({ _id: originalSuggestion._id })
        }
    })

    it('unauthenticated user cannot delete Suggestion', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/suggestions/${originalSuggestion._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const proposalExists = await Suggestion.findOne({
            _id: originalSuggestion._id,
        })
        proposalExists.should.exist
        proposalExists.should.be.an('object')
        return proposalExists.should.have.property('title')
    })

    it('authenticated user cannot delete Suggestion', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/suggestions/${originalSuggestion._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const proposalExists = await Suggestion.findOne({
            _id: originalSuggestion._id,
        })
        proposalExists.should.exist
        proposalExists.should.be.an('object')
        return proposalExists.should.have.property('title')
    })

    it('admin can delete Suggestion', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/suggestions/${originalSuggestion._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Suggestion.findOne({ _id: originalSuggestion._id }).then(
            (doc) => {
                return (doc === null).should.be.true
            },
        )
    })
})
