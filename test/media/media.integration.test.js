process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Media = mongoose.model('Media')
const User = mongoose.model('User')
const Organization = mongoose.model('Organization')
const Issue = mongoose.model('Issue')

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

describe('/api/media GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request media', async function () {
        const res = await chai.request(server).get('/api/media')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request media', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/media')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/media POST routes', async function () {
    const request = chai.request(server).keepOpen()
    const ignoredFields = [
        'issues',
        'solutions',
        'proposals',
        'votes',
        'organizations',
        'url',
    ]

    let newMedia, savedOrg, savedIssue

    before(async function () {
        newMedia = generateDoc(Media, ignoredFields)
        // Get seed data to populate created new Media object
        Organization.findOne().then((res) => (savedOrg = res))
        Issue.findOne().then((res) => (savedIssues = res))

        newMedia.organizations = savedOrg
        newMedia.issues = savedIssue
        newMedia.url = 'www.newvote.org/image.jpg'
    })

    afterEach(async function () {
        Media.findByIdAndDelete(newMedia._id).then((res) => {
            if (!res) return false
            newMedia = generateDoc(Media, ignoredFields)
            newMedia.organizations = savedOrg
            newMedia.issues = savedIssue
            newMedia.url = 'www.newvote.org/image.jpg'
        })
    })

    after(async function () {
        request.close()
        return Media.findByIdAndDelete(newMedia._id)
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/media')
            .type('form')
            .send(newMedia)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/media')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newMedia)

        res.should.have.status(403)
        return res.body.should.have.a.property('message')
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/media')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newMedia)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newMedia.title)
    })
})

/* SINGLE ROUTES TOPICS */

describe('/api/media/:mediaId GET', async function () {
    // for routes that require authentication
    const request = chai.request(server).keepOpen()
    let newMedia

    before(async function () {
        return await Media.findOne().then((mediaItem) => (newMedia = mediaItem))
    })

    after(async function () {
        return request.close()
    })
    it('unauthenticated user cannot request single media', async function () {
        const res = await chai.request(server).get(`/api/media/${newMedia._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single media', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newMedia.title)
    })

    it('user can request single media', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newMedia.title)
    })

    it('admin can request single media', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newMedia.title)
    })
})

describe('/api/media/:newMedia.id PUT', async function () {
    const request = chai.request(server).keepOpen()
    let newMedia

    before(async function () {
        return await Media.findOne().then(
            (mediaItem) => (newMedia = JSON.parse(JSON.stringify(mediaItem))),
        )
    })

    // Reset the original media after each test
    afterEach(async function () {
        return await Media.findOne({ _id: newMedia._id }).then((doc) => {
            if (doc.image === newMedia.image) return false
            doc.image = newMedia.image
            return doc.save()
        })
    })

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot update Media', async function () {
        const alteredMedia = _.assign({}, newMedia, { image: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/media/${newMedia._id}`)
            .send(alteredMedia)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbMedia = await Media.findOne({ _id: newMedia._id })
        newDbMedia.should.have.property('image')
        return newDbMedia.image.should.not.equal(alteredMedia.image)
    })

    it('authenticated user cannot update Media', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const alteredMedia = _.assign({}, newMedia, { image: 'changed.jpg' })

        const res = await chai
            .request(server)
            .put(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(alteredMedia)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbMedia = await Media.findOne({ _id: newMedia._id })
        newDbMedia.should.have.property('image')
        return newDbMedia.image.should.not.equal(alteredMedia.image)
    })

    it('admin can update media', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredMedia = _.assign({}, newMedia, { image: 'changed.jpg' })
        const res = await chai
            .request(server)
            .put(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(alteredMedia)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('image')
        res.body.image.should.equal(alteredMedia.image)

        // Second test to make sure DB has not been updated
        const newDbMedia = await Media.findOne({ _id: newMedia._id })
        newDbMedia.should.have.property('image')
        return newDbMedia.image.should.equal(alteredMedia.image)
    })
})

describe('/api/media/:mediaId DELETE', async function () {
    const request = chai.request(server).keepOpen()
    const ignoredFields = [
        'issues',
        'solutions',
        'proposals',
        'votes',
        'organizations',
        'url',
    ]

    let newMedia, savedOrg, savedIssue

    before(async function () {
        newMedia = generateDoc(Media, ignoredFields)
        // Get seed data to populate created new Media object
        Organization.findOne().then((res) => (savedOrg = res))
        Issue.findOne().then((res) => (savedIssues = res))

        newMedia.organizations = savedOrg
        newMedia.issues = savedIssue
        newMedia.url = 'www.newvote.org/image.jpg'
        return Media.create(newMedia)
    })

    afterEach(async function () {
        Media.findByIdAndDelete(newMedia._id).then((res) => {
            if (!res) return false
            newMedia = generateDoc(Media, ignoredFields)
            newMedia.organizations = savedOrg
            newMedia.issues = savedIssue
            newMedia.url = 'www.newvote.org/image.jpg'
            return Media.create(newMedia)
        })
    })

    after(async function () {
        request.close()
        return Media.findByIdAndDelete(newMedia._id)
    })

    it('unauthenticated user cannot delete Media', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/media/${newMedia._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const mediaExists = await Media.findOne({ _id: newMedia._id })
        mediaExists.should.exist
        mediaExists.should.be.an('object')
        return mediaExists.should.have.property('title')
    })

    it('authenticated user cannot delete Media', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const mediaExists = await Media.findOne({ _id: newMedia._id })
        mediaExists.should.exist
        mediaExists.should.be.an('object')
        return mediaExists.should.have.property('title')
    })

    it('admin can delete Media', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/media/${newMedia._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Media.findOne({ _id: newMedia._id }).then((doc) => {
            return (doc === null).should.be.true
        })
    })
})
