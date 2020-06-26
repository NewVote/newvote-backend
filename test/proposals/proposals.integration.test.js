process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Proposal = mongoose.model('Proposal')
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

describe('/api/proposals GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request proposals', async function () {
        const res = await chai.request(server).get('/api/proposals')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request proposals', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/proposals')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/proposals POST routes', async function () {
    const request = chai.request(server).keepOpen()
    let newProposal = generateDoc(Proposal)

    afterEach(async function () {
        Proposal.findByIdAndDelete(newProposal._id).then((res) => {
            if (!res) return false
            newProposal = generateDoc(Proposal)
        })
    })

    after(async function () {
        request.close()
        return Proposal.findByIdAndDelete(newProposal._id)
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/proposals')
            .type('form')
            .send(newProposal)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/proposals')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newProposal)

        res.should.have.status(403)
        return res.body.should.have.a.property('message')
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/proposals')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newProposal)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newProposal.title)
    })
})

// // // /* SINGLE ROUTES TOPICS */

describe('/api/proposals/:proposalId GET', async function () {
    let proposalId
    let newProposal = generateDoc(Proposal)
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    // Get initial proposal id for requests
    before(async function () {
        proposalId = newProposal._id
        const iss = new Proposal(newProposal)
        return await iss.save()
    })

    after(async function () {
        request.close()
        return await Proposal.findByIdAndDelete(proposalId)
    })

    it('unauthenticated user cannot request single proposal', async function () {
        const res = await chai
            .request(server)
            .get(`/api/proposals/${proposalId}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single proposal', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/proposals/${proposalId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newProposal.title)
    })

    it('user can request single proposal', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/proposals/${proposalId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newProposal.title)
    })

    it('admin can request single proposal', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/proposals/${proposalId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newProposal.title)
    })
})

describe('/api/proposals/:proposalId PUT', async function () {
    let proposalId
    let newProposal = generateDoc(Proposal)

    const request = chai.request(server).keepOpen()

    before(async function () {
        proposalId = newProposal._id
        return Proposal.create(newProposal)
    })

    // Reset the original proposal after each test
    afterEach(async function () {
        return await Proposal.findOne({ _id: proposalId }).then((doc) => {
            if (doc.imageUrl === newProposal.imageUrl) return false
            doc.imageUrl = newProposal.ImageUrl
            return doc.save()
        })
    })

    after(async function () {
        request.close()
        return await Proposal.findByIdAndDelete(proposalId)
    })

    it('unauthenticated user cannot update Proposal', async function () {
        const alteredProposal = _.assign({}, newProposal, {
            imageUrl: 'changed.jpg',
        })

        const res = await chai
            .request(server)
            .put(`/api/proposals/${proposalId}`)
            .send(alteredProposal)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbProposal = await Proposal.findOne({ _id: proposalId })
        newDbProposal.should.have.property('imageUrl')
        return newDbProposal.imageUrl.should.not.equal(alteredProposal.imageUrl)
    })

    it('authenticated user cannot update Proposal', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const alteredProposal = _.assign({}, newProposal, {
            imageUrl: 'changed.jpg',
        })

        const res = await chai
            .request(server)
            .put(`/api/proposals/${proposalId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredProposal)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbProposal = await Proposal.findOne({ _id: proposalId })
        newDbProposal.should.have.property('imageUrl')
        return newDbProposal.imageUrl.should.not.equal(alteredProposal.imageUrl)
    })

    it('admin can update proposals', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredProposal = _.assign({}, newProposal, {
            imageUrl: 'changed.jpg',
        })
        const res = await chai
            .request(server)
            .put(`/api/proposals/${proposalId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredProposal)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('imageUrl')
        res.body.imageUrl.should.equal(alteredProposal.imageUrl)

        // Second test to make sure DB has not been updated
        const newDbProposal = await Proposal.findOne({ _id: proposalId })
        newDbProposal.should.have.property('imageUrl')
        return newDbProposal.imageUrl.should.equal(alteredProposal.imageUrl)
    })
})

describe('/api/proposals/:proposalId DELETE', async function () {
    let originalProposal
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    before(async function () {
        // Cannot resave proposal - so generate a new proposal which will be deleted
        let newProposal = new Proposal(generateDoc(Proposal))
        originalProposal = _.cloneDeep(newProposal)
        newProposal.save()
    })

    // Reset the original Proposal after each test
    afterEach(async function () {
        await Proposal.findOne({ _id: originalProposal._id })
            .then((doc) => {
                if (doc) return false
                // If doc is deleted replace so not to break future tests
                let newProposal = new Proposal(generateDoc(Proposal))
                return newProposal.save()
            })
            .then((doc) => {
                if (!doc) return false
                originalProposal = doc
            })
    })

    after(async function () {
        request.close()
        // If proposal persists remove it
        if (originalProposal && originalProposal._id) {
            return Proposal.findOneAndRemove({ _id: originalProposal._id })
        }
    })

    it('unauthenticated user cannot delete Proposal', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/proposals/${originalProposal._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const proposalExists = await Proposal.findOne({
            _id: originalProposal._id,
        })
        proposalExists.should.exist
        proposalExists.should.be.an('object')
        return proposalExists.should.have.property('title')
    })

    it('authenticated user cannot delete Proposal', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/proposals/${originalProposal._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const proposalExists = await Proposal.findOne({
            _id: originalProposal._id,
        })
        proposalExists.should.exist
        proposalExists.should.be.an('object')
        return proposalExists.should.have.property('title')
    })

    it('admin can delete Proposal', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/proposals/${originalProposal._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Proposal.findOne({ _id: originalProposal._id }).then((doc) => {
            return (doc === null).should.be.true
        })
    })
})
