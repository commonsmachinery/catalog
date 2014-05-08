
'use strict';

var request = require('supertest')('');
var expect = require('expect.js');
var util = require('./util');

var exports = module.exports;

exports.post = function post(data, user){
    return request.post(data.url)
    .send(data)
    .set('Content-type', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(302);
        var redirectURL = res.header.location;
        var pattern = new RegExp('\\/sources\\/(\\d+)');
        expect(redirectURL).to.match(pattern);
        data.id = redirectURL.match(pattern)[1];
    });
};

exports.get = function get(data, user){
    return request.get(data.url + '/' + data.id)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var source = res.body;
        expect(source.resource).to.be(data.resource);
        expect(new Date(source.added)).to.not.be('Invalid Date');
        data.updated = source.updated;
        data.addedBy = res.body.addedBy;

        // Check permissions
        if (user) {
            expect(source.permissions.read).to.be.ok();
        }
    });
};

exports.put = function put(data, user){
    return request.put(data.url + '/' + data.id)
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
        expect(source.updatedBy).to.be(data.addedBy);
        expect(source.resource).to.be(data.resource);

        // Permissions should allow us to further manipulate this
        // object
        expect(source.permissions.read).to.be.ok();
        expect(source.permissions.edit).to.be.ok();
        expect(source.permissions.delete).to.be.ok();
    });
};

exports.remove = function remove(data, user){
    return request.delete(data.url + '/' + data.id)
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(204);
        exports.get(data).end(function(err, res){
            /* ToDo: check specific error code */
            expect(err.toString()).to.contain('expected 404');
        });
    });
};
