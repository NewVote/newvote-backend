process.env.NODE_ENV = 'test';

let mongoose = require('../config/lib/mongoose.js');
mongoose.loadModels();
//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
var path = require('path');
var app = require('../config/lib/express').init('mongodb://localhost/newvote-test');
let should = chai.should();

app.listen(3000, function () {
    console.log('listening');
})

chai.use(chaiHttp);

describe('start', () => {
    it('should do a request', function (done) {
        this.timeout(100000);
        chai.request(app)
            .get('/api/solutions')
            .end((err, res) => {
                console.log(err, 'this is err');
                console.log(res, 'this is res');

                done();
            })
    })
})