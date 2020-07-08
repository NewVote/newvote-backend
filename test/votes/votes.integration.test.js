process.env.NODE_ENV = 'test'

const chai = require('chai')
const chaiHttp = require('chai-http')
const server = require('../test.js')
const _ = require('lodash')
const dummy = require('mongoose-dummy')

const mongoose = require('mongoose')
const Solution = mongoose.model('Solution')
const Vote = mongoose.model('Vote')
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

describe('/api/votes GET routes', async function () {
    const request = chai.request(server).keepOpen()

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request votes', async function () {
        const res = await chai.request(server).get('/api/votes')

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('user can request votes', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get('/api/votes')
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        return res.body.should.be.a('array')
    })
})
/*
    Vote {
        object: "5cd55d90bc1d0d3908c67b0f",
        objectType: "Vote",
        voteValue: 1
    }
*/
describe('/api/votes POST routes', async function () {
    const request = chai.request(server).keepOpen()
    let newVote

    before(async function () {
        // Build a vote object to send
        return await Solution.findOne()
            .then((solution) => {
                let vote = {}
                vote.object = solution._id
                ;(vote.objectType = 'Solution'), (vote.voteValue = 0)
                return (newVote = vote)
            })
            .catch((err) => {
                return err
            })
    })

    after(async function () {
        request.close()
    })

    it('POST request from guest should be rejected', async function () {
        const res = await chai.request(server).post('/api/votes').send(newVote)

        res.should.not.have.status(200)
        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from unverified user should be rejected', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .post('/api/votes')
            .set({ authorization: `Bearer ${authToken}` })
            .send(newVote)

        res.should.not.have.status(200)
        res.should.have.status(403)
        res.body.should.be.an('object')
        return res.body.should.have.a.property('message')
    })

    it('POST request from user accepted', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await request
            .post('/api/votes')
            .set({ authorization: `Bearer ${authToken}` })
            .send(newVote)

        res.should.have.status(200)
        res.body.should.have.a.property('voteValue')
        return res.body.voteValue.should.equal(newVote.voteValue)
    })

    it('POST request from admin is accepted', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await request
            .post('/api/votes')
            .set({ authorization: `Bearer ${authToken}` })
            .send(newVote)

        res.should.have.status(200)
        res.body.should.have.a.property('voteValue')
        return res.body.voteValue.should.equal(newVote.voteValue)
    })
})

// // /* SINGLE ROUTES TOPICS */

describe('/api/votes/:voteId GET', async function () {
    let newVote
    const request = chai.request(server).keepOpen()

    // Get initial vote id for requests
    before(async function () {
        await Vote.findOne().then((vote) => (newVote = vote))
    })

    after(async function () {
        request.close()
    })

    it('unauthenticated user cannot request single vote', async function () {
        const res = await chai.request(server).get(`/api/votes/${newVote._id}`)

        res.should.have.status(401)
        res.body.should.be.an('object')
        return res.body.should.have.property('message')
    })

    it('unverfied user can request single vote', async function () {
        const login = await userLogin(request, unverified)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/votes/${newVote._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('objectType')
        return res.body.objectType.should.equal(newVote.objectType)
    })

    it('user can request single vote', async function () {
        const login = await userLogin(request, user)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/votes/${newVote._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('objectType')
        return res.body.objectType.should.equal(newVote.objectType)
    })

    it('admin can request single vote', async function () {
        const login = await userLogin(request, admin)
        const authToken = login.body.token

        const res = await chai
            .request(server)
            .get(`/api/votes/${newVote._id}`)
            .set({ authorization: `Bearer ${authToken}` })

        res.should.have.status(200)
        res.body.should.be.an('object')
        res.body.should.have.property('objectType')
        return res.body.objectType.should.equal(newVote.objectType)
    })
})

// describe('/api/votes/:voteId PUT', async function () {

//     let newVote;
//     const request = chai.request(server).keepOpen();

//     // Get initial vote id for requests
//     before(async function () {
//         await Vote.findOne()
//             .then((vote) => {
//                 newVote = JSON.parse(JSON.stringify(vote));
//                 newVote.voteValue = -1;
//                 vote.votevalue = -1;
//                 return vote.save();
//             }).then((vote) =>{
//             })
//     })

//     // Reset the value of the vote on the database
//     afterEach(async function () {
//         await Vote.findOne({ _id: newVote._id })
//             .then((vote) => {
//                 if (vote.voteValue === 0) return false;
//                 vote.voteValue = 0;
//                 return vote.save();
//             })

//     })

//     after(async function () {
//         return request.close();
//     })

//     it('unauthenticated user cannot update Vote', async function () {
//         return false;
//         const alteredVote =  _.assign({}, newVote, { voteValue: '1' });

//         const res = await chai.request(server)
//             .put(`/api/votes/${newVote._id}`)
//             .send(alteredVote)

//         res.should.have.status(401);
//         res.body.should.be.an('object');
//         res.body.should.have.property('message');

//         // Second test to make sure DB has not been updated
//         const newDbVote = await Vote.findOne({ _id: newVote._id })
//         newDbVote.should.have.property('voteValue');
//         return newDbVote.voteValue.should.not.equal(parseInt(alteredVote.voteValue));
//     });

// it('authenticated user cannot update Vote', async function () {
//     const login = await userLogin(request, user);
//     const authToken = login.body.token;

//     const alteredVote =  _.assign({}, newVote, { voteValue: '1' });

//     const res = await chai.request(server)
//         .put(`/api/votes/${newVote._id}`)
//         .set({ authorization: `Bearer ${authToken}` })
//         .send(alteredVote)

//     // Error is passed up to express error handlers - Needs updating
//     res.should.have.status(403);
//     res.body.should.be.an('object');
//     res.body.should.have.property('message');

//     // Second test to make sure DB has not been updated
//     const newDbVote = await Vote.findOne({ _id: newVote._id })
//     newDbVote.should.have.property('voteValue');
//     return newDbVote.voteValue.should.not.equal(parseInt(alteredVote.voteValue));
// })

// it('admin can update votes', async function () {
//     const login = await userLogin(request, admin);
//     const authToken = login.body.token;

//     const alteredVote =  _.assign({}, newVote, { voteValue: '1' });

//     const res = await chai.request(server)
//         .put(`/api/votes/${newVote._id}`)
//         .set({ authorization: `Bearer ${authToken}` })
//         .send(alteredVote)

//     res.should.have.status(200);
//     res.body.should.be.an('object');
//     res.body.should.have.property('voteValue');
//     res.body.voteValue.should.equal(parseInt(alteredVote.voteValue));

//     // Second test to make sure DB has not been updated
//     const newDbVote = await Vote.findOne({ _id: newVote._id })
//     newDbVote.should.have.property('voteValue');
//     return newDbVote.voteValue.should.equal(parseInt(alteredVote.voteValue));
// })
// })

// describe('/api/votes/:newVote._id DELETE', async function () {

//     let originalSolution;
//     // for routes that require authentication
//     const request = chai.request(server).keepOpen();

//     before(async function () {
//         // Cannot resave vote - so generate a new vote which will be deleted
//         let newVote = new Vote(generateDoc(Vote));
//         originalSolution = _.cloneDeep(newVote);
//         newVote.save()
//     })

//     // Reset the original Vote after each test
//     afterEach(async function () {
//         await Vote.findOne({ _id: originalSolution._id })
//             .then((doc) => {
//                 if (doc) return false;
//                 // If doc is deleted replace so not to break future tests
//                 let newVote = new Vote(generateDoc(Vote));
//                 return newVote.save()
//             })
//             .then((doc) => {
//                 if (!doc) return false;
//                 originalSolution = doc;
//             })
//     })

//     after(async function () {
//         request.close();
//         // If vote persists remove it
//         if (originalSolution && originalSolution._id) {
//             return Vote.findOneAndRemove({ _id: originalSolution._id });
//         }
//     })

//     it('unauthenticated user cannot delete Vote', async function () {
//         const res = await chai.request(server)
//             .delete(`/api/votes/${originalSolution._id}`)

//         res.should.have.status(401);
//         res.body.should.be.an('object');
//         res.body.should.have.property('message');

//         // Second test to make sure DB has not been updated
//         const solutionExists = await Vote.findOne({ _id: originalSolution._id });
//         solutionExists.should.exist;
//         solutionExists.should.be.an('object');
//         return solutionExists.should.have.property('objectType')
//     });

//     it('authenticated user cannot delete Vote', async function () {
//         const login = await userLogin(request, user);
//         const authToken = login.body.token;

//         const res = await chai.request(server)
//             .delete(`/api/votes/${originalSolution._id}`)
//             .set({ authorization: `Bearer ${authToken}` })

//         res.should.have.status(403);
//         res.body.should.be.an('object');
//         res.body.should.have.property('message');

//         // Second test to make sure DB has not been updated
//         const solutionExists = await Vote.findOne({ _id: originalSolution._id });
//         solutionExists.should.exist;
//         solutionExists.should.be.an('object');
//         return solutionExists.should.have.property('objectType')
//     });

//     it('admin can delete Vote', async function () {
//         const login = await userLogin(request, admin);
//         const authToken = login.body.token;

//         const res = await chai.request(server)
//             .delete(`/api/votes/${originalSolution._id}`)
//             .set({ authorization: `Bearer ${authToken}` })

//         res.should.have.status(200);
//         // Second test to make sure DB has not been updated
//         return Vote.findOne({ _id: originalSolution._id })
//             .then((doc) => {
//                 return (doc === null).should.be.true;
//             })
//     });
// })
