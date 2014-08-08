/*
 * Catalog API test - request transformations
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, after */

'use strict';

var debug = require('debug')('catalog:apitest:requests');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');
var url = require('url');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Request transformations', function() {
    var workID;   // Will be set to the ID for this work
    var workURI;  // Will be set to the URI for this work

    var testUserID;
    var testUserURI;

    var otherUserID;
    var otherUserURI;

    // get IDs for work owner and collaborator
    before(function(done) {
        var req = request(config.frontend.baseURL);
        req.get('/users/current')
            .set('Authorization', util.auth(util.testUser))
            .expect(302)
            .expect('location', util.urlRE.user)
            .end(function(err, res) {
                if (err) return done(err);
                var testUserURI = res.header.location;
                request('')
                    .get(testUserURI)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);
                        testUserID = res.body.id;
                        done();
                    });
            });
    });

    before(function(done) {
        var req = request(config.frontend.baseURL);
        req.get('/users/current')
            .set('Authorization', util.auth(util.otherUser))
            .expect(302)
            .expect('location', util.urlRE.user)
            .end(function(err, res) {
                if (err) return done(err);
                var otherUserURI = res.header.location;
                request('')
                    .get(otherUserURI)
                    .set('Accept', 'application/json')
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);
                        otherUserID = res.body.id;
                        done();
                    });
            });
    });

    before(function(done) {
        var req = request(config.frontend.baseURL);
        req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({
                alias: 'req-' + Date.now() + '-' + util.testUser
            })
            .expect( 201 )
            .expect(function(res) {
                workURI = res.header.location;
                workID = res.body.id;
            })
            .end(done);
    });

    it('should accept collabs.users as objects when updating', function(done) {
        var req = request('');
        req.put(workURI)
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({
                collabs: {
                    users: [{
                        id: otherUserID,
                        href: otherUserURI
                    }]
                }
            })
            .expect(200)
            .expect(function(res) {
                var w = res.body;

                expect( w ).to.have.property ( 'collabs' );
                expect( w.collabs ).to.have.property ( 'users' );
                expect( w.collabs.users ).to.be.an( 'array' );
                expect( w.collabs.users[0] ).to.have.property( 'id' );
                expect( w.collabs.users[0].id ).to.be( otherUserID );
            })
            .end(done);
    });
});
