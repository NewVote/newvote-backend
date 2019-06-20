process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../test.js');

chai.use(chaiHttp);

describe('start', () => {
    it('should do a org request', function (done) {
        this.timeout(10000);
        chai.request(server)
            .get('/api/organizations')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.be.a('array');
                res.body.length.should.be.eql(0);
                done();
            })
    })
})