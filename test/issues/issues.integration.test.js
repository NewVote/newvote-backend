process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Issue = mongoose.model('Issue')
const User = mongoose.model('User')

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

describe('/api/issues GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request issues', async function () {
        const res = await chai.request(server).get('/api/issues')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request issues', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/issues')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/issues POST routes', async function () {
    const request = chai.request(server).keepOpen()
    let newIssue = generateDoc(Issue)

    afterEach(async function () {
        Issue.findByIdAndDelete(newIssue._id).then((res) => {
            if (!res) return false
            newIssue = generateDoc(Issue)
        })
    })

    after(async function () {
        request.close()
        return Issue.findByIdAndDelete(newIssue._id)
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/issues')
            .type('form')
            .send(newIssue)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/issues')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newIssue)

        res.should.have.status(403)
        return res.body.should.have.a.property('message')
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/issues')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newIssue)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newIssue.name)
    })
})

// /* SINGLE ROUTES TOPICS */

describe('/api/issues/:issueId GET', async function () {
    let issueId
    let newIssue = generateDoc(Issue)
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    // Get initial issue id for requests
    before(async function () {
        issueId = newIssue._id
        const iss = new Issue(newIssue)
        return await iss.save()
    })

    after(async function () {
        request.close()
        return await Issue.findByIdAndDelete(issueId)
    })

    it('unauthenticated user cannot request single issue', async function () {
        const res = await chai.request(server).get(`/api/issues/${issueId}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single issue', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/issues/${issueId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newIssue.name)
    })

    it('user can request single issue', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/issues/${issueId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newIssue.name)
    })

    it('admin can request single issue', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/issues/${issueId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newIssue.name)
    })
})

describe('/api/issues/:issueId PUT', async function () {
    let issueId
    let newIssue = generateDoc(Issue)

    const request = chai.request(server).keepOpen()

    before(async function () {
        issueId = newIssue._id
        return Issue.create(newIssue)
    })

    // Reset the original issue after each test
    afterEach(async function () {
        return await Issue.findOne({ _id: issueId }).then((doc) => {
            if (doc.imageUrl === newIssue.imageUrl) return false
            doc.imageUrl = newIssue.ImageUrl
            return doc.save()
        })
    })

    after(async function () {
        request.close()
        return await Issue.findByIdAndDelete(issueId)
    })

    it('unauthenticated user cannot update Issue', async function () {
        const alteredIssue = _.assign({}, newIssue, { imageUrl: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/issues/${issueId}`)
            .send(alteredIssue)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbIssue = await Issue.findOne({ _id: issueId })
        newDbIssue.should.have.property('imageUrl')
        return newDbIssue.imageUrl.should.not.equal(alteredIssue.imageUrl)
    })

    it('authenticated user cannot update Issue', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const alteredIssue = _.assign({}, newIssue, { imageUrl: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/issues/${issueId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredIssue)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbIssue = await Issue.findOne({ _id: issueId })
        newDbIssue.should.have.property('imageUrl')
        return newDbIssue.imageUrl.should.not.equal(alteredIssue.imageUrl)
    })

    it('admin can update issues', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredIssue = _.assign({}, newIssue, { imageUrl: 'changed.jpg' })
        const res = await chai
            .request(server)
            .put(`/api/issues/${issueId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredIssue)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('imageUrl')
        res.body.imageUrl.should.equal(alteredIssue.imageUrl)

        // Second test to make sure DB has not been updated
        const newDbIssue = await Issue.findOne({ _id: issueId })
        newDbIssue.should.have.property('imageUrl')
        return newDbIssue.imageUrl.should.equal(alteredIssue.imageUrl)
    })
})

describe('/api/issues/:issueId DELETE', async function () {
    let originalIssue
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    before(async function () {
        // Cannot resave issue - so generate a new issue which will be deleted
        let newIssue = new Issue(generateDoc(Issue))
        originalIssue = _.cloneDeep(newIssue)
        newIssue.save()
    })

    // Reset the original Issue after each test
    afterEach(async function () {
        await Issue.findOne({ _id: originalIssue._id }).then((doc) => {
            if (doc) return false
            // If doc is deleted replace so not to break future tests
            let newIssue = new Issue(generateDoc(Issue))
            originalIssue = doc
            return newIssue.save()
        })
    })

    after(async function () {
        request.close()
        // If issue persists remove it
        if (originalIssue && originalIssue._id) {
            Issue.findOneAndRemove({ _id: originalIssue._id })
        }
    })

    it('unauthenticated user cannot delete Issue', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/issues/${originalIssue._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const topicExists = await Issue.findOne({ _id: originalIssue._id })
        topicExists.should.exist
        topicExists.should.be.an('object')
        return topicExists.should.have.property('name')
    })

    it('authenticated user cannot delete Issue', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/issues/${originalIssue._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const topicExists = await Issue.findOne({ _id: originalIssue._id })
        topicExists.should.exist
        topicExists.should.be.an('object')
        return topicExists.should.have.property('name')
    })

    it('admin can delete Issue', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/issues/${originalIssue._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Issue.findOne({ _id: originalIssue._id }).then((doc) => {
            return (doc === null).should.be.true
        })
    })
})
