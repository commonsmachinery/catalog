
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
        var pattern = new RegExp('(\\/works\\/\\d+)');
        data.resource = redirectURL;
        expect(redirectURL).to.match(pattern);
    });
}

exports.get = function get(data, user){
    return request.get(data.resource.replace(baseURL,''))
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        expect(work.resource).to.be(data.resource);
        data.updated = work.updated;
        expect(new Date(work.created)).to.not.be('Invalid Date');
    });
}

exports.put = function put(data, user){
    return request.put(data.resource.replace(baseURL,''))
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        var created = new Date(work.created);
        var updated = new Date(work.updated);
        data.updated = work.updated;
        expect(work.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(created);
        expect(work.updatedBy).to.be(user)
    });
}

exports.remove = function remove(data, user){
    var path = data.replace(baseURL,'');
    return request.delete(path)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            expect(err).to.be(404);
        });
    });
}