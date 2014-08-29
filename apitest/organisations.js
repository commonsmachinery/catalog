/*
 * Catalog API test - organisations
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, after */

'use strict';

var debug = require('debug')('catalog:apitest:organisations');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Organisations', function() {
    describe('GET /org', function() {
        var orgId;
        var orgURI;
        var workURI;

        // create organisation
        before(function(done) {
            var req = request(config.frontend.baseURL);
            req.post('/org')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    alias: 'org-' + Date.now()
                })
                .expect( 201 )
                .expect( 'etag', util.etagRE )
                .expect( 'location', util.urlRE.organisation )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    orgURI = res.header.location;
                    orgId = res.body.id;
                })
                .end(done);
        });

        // create work
        before(function(done){
            var req = request(config.frontend.baseURL);
            req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({
                alias: 'work-' + Date.now(),
                owner: {
                    org: orgId,
                },
            })
            .expect(201)
            .end(function(err, res) {
                if (res) {
                    workURI = res.header.location;
                }
                return done(err);
            });
        });

        it('should get id and href', function(done) {
            var req = request('');
            req.get(orgURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(res) {
                    var o = res.body;

                    expect( o.id ).to.be.ok();
                    expect( o.href ).to.be( orgURI );
                })
                .end(done);
        });

        it('should get self link and etag', function(done) {
            var req = request('');
            req.get(orgURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('org link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( orgURI );

                    debug('org etag: %s', res.header.etag);
                })
                .end(done);
        });

        it('should include write permission for organisation itself', function(done) {
            var req = request('');
            req.get(orgURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var o = res.body;
                    expect( o._perms.write ).to.be.ok();
                })
                .end(done);
        });

        it('should not include write permission for other users', function(done) {
            var req = request('');
            req.get(orgURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(200)
                .expect(function(res) {
                    var o = res.body;
                    expect( o._perms.write ).to.not.be.ok();
                })
                .end(done);
        });

        it('should not include write permission for anonymous users', function(done) {
            var req = request('');
            req.get(orgURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(res) {
                    var o = res.body;
                    expect( o._perms.write ).to.not.be.ok();
                })
                .end(done);
        });

        it('GET /work should populate owner.org', function(done) {
            var req = request('');
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w.owner ).to.be.ok();
                    expect( w.owner ).to.have.property( 'org' );
                    expect( w.owner.org ).to.have.property( 'id' );
                    expect( w.owner.org.id ).to.eql( orgId );
                })
                .end(done);
        });

        it('GET /work should include owner.org', function(done) {
            var req = request('');
            req.get(workURI + '?include=owner.org')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w.owner ).to.be.ok();
                    expect( w.owner ).to.have.property( 'org' );
                    expect( w.owner.org ).to.have.property( 'profile' );
                    expect( w.owner.org.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });
    });
});
