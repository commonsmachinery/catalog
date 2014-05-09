
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
};

exports.get = function get(data, user){
    return request.get(data.resource)
    .set('Accept', 'application/json')
    .set('Authorization', util.auth(user))
    .expect(function(res){
        expect(res.status).to.be(200);
        var work = res.body;
        expect(work.resource).to.be(data.resource);

        // Check permissions
        if (user) {
            expect(work.permissions.read).to.ok();

            // (TODO: need to get current user URI from server in a
            // response header to be able to check this
            /*
            if (currentUserURI === work.creator) {
                expect(work.permissions.edit).to.be.ok();
                expect(work.permissions.delete).to.be.ok();
            }
            else {
                expect(work.permissions.edit).to.be.not.ok();
                expect(work.permissions.delete).to.be.not.ok();
            }
            */
        }

        data.updated = work.updated;
        data.creator = res.body.creator;
        expect(new Date(work.created)).to.not.be('Invalid Date');
    });
};

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
        expect(work.visible).to.be(data.visible);
        expect(work.state).to.be(data.state);

        // Permissions should allow us to further manipulate this
        // object
        expect(work.permissions.read).to.be.ok();
        expect(work.permissions.edit).to.be.ok();
        expect(work.permissions.delete).to.be.ok();

        data.updated = updated;
    });
};

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
};
