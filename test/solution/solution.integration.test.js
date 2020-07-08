process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Solution = mongoose.model('Solution')
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

describe('/api/solutions GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request solutions', async function () {
        const res = await chai.request(server).get('/api/solutions')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request solutions', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/solutions')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})

describe('/api/solutions POST routes', async function () {
    const request = chai.request(server).keepOpen()
    let newSolution = generateDoc(Solution)

    afterEach(async function () {
        Solution.findByIdAndDelete(newSolution._id).then((res) => {
            if (!res) return false
            newSolution = generateDoc(Solution)
        })
    })

    after(async function () {
        request.close()
        return Solution.findByIdAndDelete(newSolution._id)
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai
            .request(server)
            .post('/api/solutions')
            .type('form')
            .send(newSolution)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user rejected', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/solutions')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newSolution)

        res.should.have.status(403)
        return res.body.should.have.a.property('message')
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/solutions')
            .set({ authorization: `Bearer ${authToken}` })
            .type('form')
            .send(newSolution)

        res.should.have.status(200)
        res.body.should.be.a('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSolution.title)
    })
})

// // /* SINGLE ROUTES TOPICS */

describe('/api/solutions/:solutionId GET', async function () {
    let solutionId
    let newSolution = generateDoc(Solution)
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    // Get initial solution id for requests
    before(async function () {
        solutionId = newSolution._id
        const iss = new Solution(newSolution)
        return await iss.save()
    })

    after(async function () {
        request.close()
        return await Solution.findByIdAndDelete(solutionId)
    })

    it('unauthenticated user cannot request single solution', async function () {
        const res = await chai
            .request(server)
            .get(`/api/solutions/${solutionId}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single solution', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/solutions/${solutionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSolution.title)
    })

    it('user can request single solution', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/solutions/${solutionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSolution.title)
    })

    it('admin can request single solution', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/solutions/${solutionId}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('title')
        return res.body.title.should.equal(newSolution.title)
    })
})

describe('/api/solutions/:solutionId PUT', async function () {
    let solutionId
    let newSolution = generateDoc(Solution)

    const request = chai.request(server).keepOpen()

    before(async function () {
        solutionId = newSolution._id
        return Solution.create(newSolution)
    })

    // Reset the original solution after each test
    afterEach(async function () {
        return await Solution.findOne({ _id: solutionId }).then((doc) => {
            if (doc.imageUrl === newSolution.imageUrl) return false
            doc.imageUrl = newSolution.ImageUrl
            return doc.save()
        })
    })

    after(async function () {
        request.close()
        return await Solution.findByIdAndDelete(solutionId)
    })

    it('unauthenticated user cannot update Solution', async function () {
        const alteredSolution = _.assign({}, newSolution, {
            imageUrl: 'changed.jpg',
        })

        const res = await chai
            .request(server)
            .put(`/api/solutions/${solutionId}`)
            .send(alteredSolution)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbSolution = await Solution.findOne({ _id: solutionId })
        newDbSolution.should.have.property('imageUrl')
        return newDbSolution.imageUrl.should.not.equal(alteredSolution.imageUrl)
    })

    it('authenticated user cannot update Solution', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const alteredSolution = _.assign({}, newSolution, {
            imageUrl: 'changed.jpg',
        })

        const res = await chai
            .request(server)
            .put(`/api/solutions/${solutionId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredSolution)

        // Error is passed up to express error handlers - Needs updating
        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const newDbSolution = await Solution.findOne({ _id: solutionId })
        newDbSolution.should.have.property('imageUrl')
        return newDbSolution.imageUrl.should.not.equal(alteredSolution.imageUrl)
    })

    it('admin can update solutions', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const alteredSolution = _.assign({}, newSolution, {
            imageUrl: 'changed.jpg',
        })
        const res = await chai
            .request(server)
            .put(`/api/solutions/${solutionId}`)
            .set({ authorization: `Bearer ${authToken}` })
            .send(alteredSolution)

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('imageUrl')
        res.body.imageUrl.should.equal(alteredSolution.imageUrl)

        // Second test to make sure DB has not been updated
        const newDbSolution = await Solution.findOne({ _id: solutionId })
        newDbSolution.should.have.property('imageUrl')
        return newDbSolution.imageUrl.should.equal(alteredSolution.imageUrl)
    })
})

describe('/api/solutions/:solutionId DELETE', async function () {
    let originalSolution
    // for routes that require authentication
    const request = chai.request(server).keepOpen()

    before(async function () {
        // Cannot resave solution - so generate a new solution which will be deleted
        let newSolution = new Solution(generateDoc(Solution))
        originalSolution = _.cloneDeep(newSolution)
        newSolution.save()
    })

    // Reset the original Solution after each test
    afterEach(async function () {
        await Solution.findOne({ _id: originalSolution._id })
            .then((doc) => {
                if (doc) return false
                // If doc is deleted replace so not to break future tests
                let newSolution = new Solution(generateDoc(Solution))
                return newSolution.save()
            })
            .then((doc) => {
                if (!doc) return false
                originalSolution = doc
            })
    })

    after(async function () {
        request.close()
        // If solution persists remove it
        if (originalSolution && originalSolution._id) {
            return Solution.findOneAndRemove({ _id: originalSolution._id })
        }
    })

    it('unauthenticated user cannot delete Solution', async function () {
        const res = await chai
            .request(server)
            .delete(`/api/solutions/${originalSolution._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const solutionExists = await Solution.findOne({
            _id: originalSolution._id,
        })
        solutionExists.should.exist
        solutionExists.should.be.an('object')
        return solutionExists.should.have.property('title')
    })

    it('authenticated user cannot delete Solution', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/solutions/${originalSolution._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(403)
        res.body.should.be.an('object')
        res.body.should.have.property('message')

        // Second test to make sure DB has not been updated
        const solutionExists = await Solution.findOne({
            _id: originalSolution._id,
        })
        solutionExists.should.exist
        solutionExists.should.be.an('object')
        return solutionExists.should.have.property('title')
    })

    it('admin can delete Solution', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .delete(`/api/solutions/${originalSolution._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        // Second test to make sure DB has not been updated
        return Solution.findOne({ _id: originalSolution._id }).then((doc) => {
            return (doc === null).should.be.true
        })
    })
})
