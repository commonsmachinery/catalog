
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');

var exports = module.exports;

exports.post = function post(data, user){
    return request.post(data.resource)
    .send(data)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp('\\/sources\\/\\d+');
        data.resource = redirectURL;
        expect(redirectURL).to.match(pattern);
    });
}

exports.get = function get(data, user){
    return request.get(data.resource)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var source = res.body;
        expect(source.resource).to.be(data.resource);
        expect(new Date(source.added)).to.not.be('Invalid Date');
        data.updated = source.updated;
        data.addedBy = res.body.addedBy;
    });
}

exports.put = function put(data, user){
    return request.put(data.resource)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var source = res.body;
        var added = new Date(source.added);
        var updated = new Date(source.updated);
        data.updated = source.updated;
        expect(source.resource).to.be(data.resource);
        expect(added).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(added);
        expect(updatedBy).to.be(data.addedBy);
    });
}

exports.remove = function remove(data, user){
    return request.delete(data.resource)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            /* ToDo: check specific error code */
            expect(err.toString()).to.contain('expected 404');
        });
    });
}