
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');

var exports = module.exports;


exports.post = function post(data, user){
    return request.post(data.resource)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp('\\/works\\/\\d+');
        expect(redirectURL).to.match(pattern);
        data.resource = redirectURL;
    });
}

exports.get = function get(data, user){
    return request.get(data.resource)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        expect(work.resource).to.be(data.resource);
        data.updated = work.updated;
        data.creator = res.body.creator;
        expect(new Date(work.created)).to.not.be('Invalid Date');
    });
}

exports.put = function put(data, user){
    return request.put(data.resource)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        var created = new Date(work.created);
        var updated = new Date(work.updated);
        expect(work.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(created);
        expect(work.updatedBy).to.be(data.creator);
        expect(work.visibility).to.be(data.visibility);
        expect(work.state).to.be(data.state);
        data.updated = updated;
    });
}

exports.remove = function remove(data, user){
    return request.delete(data.resource)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            /* ToDo: check specific error code */
            expect(err).to.not.be(null);
        });
    });
}