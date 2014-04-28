
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');

var exports = module.exports;

exports.post = function post(data, user){
    return request.post(data.url)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp('\\/works\\/\\d+\\/posts\\/(\\d+)');
        expect(redirectURL).to.match(pattern);
        data.id = redirectURL.match(pattern)[1];
    });
}

exports.get = function get(data, user){
    return request.get(data.url + '/' + data.id)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var post = res.body;
        expect(post.id).to.eql(data.id);
        expect(new Date(post.posted)).to.not.be('Invalid Date');
        data.updated = post.updated;
        data.postedBy = post.postedBy;
    });
}

exports.put = function put(data, user){
    return request.put(data.url + '/' + data.id)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .send(data)
    .expect(function(res){
        expect(res.status).to.be(200);
        var post = res.body;
        var created = new Date(post.created);
        var updated = new Date(post.updated);
        expect(post.resource).to.be(data.resource);
        expect(created).to.not.be('Invalid Date');
        expect(updated).to.not.be('Invalid Date');
        expect(updated).to.be.greaterThan(created);
        expect(updatedBy).to.be(user);
        expect(post.resource).to.be(data.resource);
        data.updated = post.updated;
    });
}

exports.remove = function remove(data, user){
    return request.delete(data.url + '/' + data.id)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            expect(err.toString()).to.contain(404);
        });
    });
}