'use strict';

var dbgfn = require('debug');
var config = require('../lib/config.js');
var expect = require('expect.js');
var util = require('./modules/util');

var request = require('supertest')('');

var baseURL = config.catalog.baseURL + '/sparql';
var user = 'user';
var otherUser = 'otherUser';

describe('SPARQL', function(){
    it('should get requested data', function(done){
        var debug = dbgfn('test:querying data');
        request.get(baseURL + '?query=SELECT ?s ?o WHERE { ?s <http://purl.org/dc/terms/title> ?o}')
        .set('Accept', 'application/json')
        .set('Authorization', util.auth(user))
        .expect(function(res){
            expect(res.status).to.be(200);
            var result = res.body;
            expect(result).to.be.an('object');
        }).end(done);
    });
});

