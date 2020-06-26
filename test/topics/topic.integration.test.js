process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Topic = mongoose.model('Topic')
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

describe('/api/topics GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request topics', async function () {
        const res = await chai.request(server).get('/api/topics')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request topics', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/topics')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/topics POST routes', async function () {
    const request = chai.request(server).keepOpen()
    let newTopic = generateDoc(Topic)

    afterEach(async function () {
        Topic.findByIdAndDelete(newTopic._id).then((res) => {
            if (!res) return false
            newTopic = generateDoc(Topic)
        })
    })

    after(async function () {
        request.close()
        Topic.findByIdAndDelete(newTopic._id)
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/topics')
            .type('form')
            .send(newTopic)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/topics')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newTopic)

        res.should.have.status(403)
        return res.body.should.have.a.property('message')
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/topics')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newTopic)

        res.should.have.status(200)
        res.body.should.be.a('object')
        return res.body.should.have.property('name')
    })
})

/* SINGLE ROUTES TOPICS */

describe('/api/topics/:topicId GET', async function () {
    let topicId
    let newTopic = generateDoc(Topic)
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    // Get initial org id for requests
    before(async function () {
        topicId = newTopic._id
        return new Topic(newTopic).save()
    })

    after(async function () {
        request.close()
        Topic.findByIdAndDelete(topicId)
    })

    it('unauthenticated user cannot request single topic', async function () {
        const res = await chai.request(server).get(`/api/topics/${topicId}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single topic', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/topics/${topicId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newTopic.name)
    })

    it('user can request single topic', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/topics/${topicId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newTopic.name)
    })

    it('admin can request single topic', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/topics/${topicId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('name')
        return res.body.name.should.equal(newTopic.name)
    })
})

describe('/api/topics/:topicId PUT', async function () {
    let topicId
    let newTopic = generateDoc(Topic)

    const request = chai.request(server).keepOpen()

    before(async function () {
        topicId = newTopic._id
        return new Topic(newTopic).save()
    })

    // Reset the original organization after each test
    afterEach(async function () {
        return Topic.findOne({ _id: topicId }).then((doc) => {
            if (doc.imageUrl === newTopic.imageUrl) return false
            doc.imageUrl = newTopic.ImageUrl
            return doc.save()
        })
    })

    after(async function () {
        request.close()
        Topic.findByIdAndDelete(topicId)
    })

    it('unauthenticated user cannot update Topic', async function () {
        const alteredTopic = _.assign({}, newTopic, { imageUrl: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/topics/${topicId}`)
            .send(alteredTopic)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbTopic = await Topic.findOne({ _id: topicId })
        newDbTopic.should.have.property('imageUrl')
        return newDbTopic.imageUrl.should.not.equal(alteredTopic.imageUrl)
    })

    it('authenticated user cannot update Topic', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const alteredTopic = _.assign({}, newTopic, { imageUrl: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/topics/${topicId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredTopic)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbTopic = await Topic.findOne({ _id: topicId })
        newDbTopic.should.have.property('imageUrl')
        return newDbTopic.imageUrl.should.not.equal(alteredTopic.imageUrl)
    })

    it('admin can update topics', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredTopic = _.assign({}, newTopic, { imageUrl: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/topics/${topicId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredTopic)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('imageUrl')
        res.body.imageUrl.should.equal(alteredTopic.imageUrl)

        // Second test to make sure DB has not been updated
        const newDbTopic = await Topic.findOne({ _id: topicId })
        newDbTopic.should.have.property('imageUrl')
        return newDbTopic.imageUrl.should.equal(alteredTopic.imageUrl)
    })
})

describe('/api/topics/:topicId DELETE', async function () {
    let originalTopic
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    before(async function () {
        // Cannot resave org - so generate a new org which will be deleted
        let newTopic = new Topic(generateDoc(Topic))
        originalTopic = _.cloneDeep(newTopic)
        newTopic.save()
    })

    // Reset the original Topic after each test
    afterEach(async function () {
        await Topic.findOne({ _id: originalTopic._id }).then((doc) => {
            if (doc) return false
            // If doc is deleted replace so not to break future tests
            let newTopic = new Topic(generateDoc(Topic))
            originalTopic = doc
            return newTopic.save()
        })
    })

    after(async function () {
        request.close()
        // If organization persists remove it
        if (originalTopic && originalTopic._id) {
            Topic.findOneAndRemove({ _id: originalTopic._id })
        }
    })

    it('unauthenticated user cannot delete Topic', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/topics/${originalTopic._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const topicExists = await Topic.findOne({ _id: originalTopic._id })
        topicExists.should.exist
        topicExists.should.be.an('object')
        return topicExists.should.have.property('name')
    })

    it('authenticated user cannot delete Topic', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/topics/${originalTopic._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const topicExists = await Topic.findOne({ _id: originalTopic._id })
        topicExists.should.exist
        topicExists.should.be.an('object')
        return topicExists.should.have.property('name')
    })

    it('admin can delete Topic', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/topics/${originalTopic._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Topic.findOne({ _id: originalTopic._id }).then((doc) => {
            return (doc === null).should.be.true
        })
    })
})
