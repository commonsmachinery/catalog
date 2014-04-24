
'use strict';

var request = require('supertest');
var expect = require('expect.js');
var util = require('./util');

var path;
var exports = module.exports;

exports.setPath = function setPath(val){
    path = val;
};

exports.post = function post(data, user){
    return request.post(path)
    .send(data)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp(path + '(\\/sources\\/\\d+)');
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
        data.updated = source.updated;
        expect(new Date(source.created)).to.not.be('Invalid Date');
        expect(new Date(source.creator)).to.be(user);
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
        var created = new Date(source.created);
        var updated = new Date(source.updated);
        data.updated = source.updated;
        expect(source.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(created);
        expect(updatedBy).to.be(user);
    });
}

exports.remove = function remove(data, user){
    return request.delete(data.resource)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data.resource).end(function(err, res){
            expect(err).to.be(404);
        });
    });
}