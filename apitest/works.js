/*
 * Catalog API test - works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:apitest:works');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Works', function() {
    var workURI;  // Will be set to the URI for this work
    var origEtag; // Will be set to etag before PUT

    // Helper stuff for work updates/checks
    var newWork = {
        alias: 'new alias',
        description: 'new description',
        public: true,
        annotations: [{
            score: 100,
            property: {
                propertyName: 'title',
                titleLabel: 'test',
                value: 'test',
            },
        }],
    };

    var checkWork = function(w, asSelf) {
        expect( w.alias ).to.be( 'new alias' );
        expect( w.description ).to.be( 'new description' );
        expect( w.public ).to.be( true );
        expect( w ).to.have.property( 'annotations' );
        expect( w.annotations.length ).to.be( 1 );
        expect( w.annotations[0].score ).to.be( 100 );
        expect( w.annotations[0].property.propertyName ).to.be( 'title' );
        expect( w.annotations[0].property.titleLabel ).to.be( 'test' );
        expect( w.annotations[0].property.value ).to.be( 'test' );
    };

    // Actual test cases

    describe('POST /works', function() {
        var req = request(config.frontend.baseURL);

        it('should redirect to newly created work', function(done) {
            req.post('/works')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({})
                .expect(302)
                .expect('location', /\/works\/[^\/]+$/)
                .end(function(err, res) {
                    if (res) {
                        workURI = res.header.location;
                        debug('using %s: %s', util.testUser, workURI);
                    }
                    done(err);
                });
        });

    });

    describe('GET /works/ID', function() {
        var req = request('');

        it('should get self link and etag', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    debug('work link: %s', res.header.link);

                    expect( res.header.link ).to.not.be( undefined );
                    expect( parseLinks(res.header.link).self ).to.be( workURI );

                    debug('work etag: %s', res.header.etag);
                    expect( res.header.etag ).to.match( /^W\/".*"$/ );
                    origEtag = res.header.etag;
                })
                .end(done);
        });

        it('should include write permission for owner', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;
                    expect( w._perms.write ).to.be.ok();
                })
                .end(done);
        });

        it('should not allow accessing private work for other users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should not allow accessing private work for anonymous users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .expect(403)
                .end(done);
        });
    });

    describe('PUT /users/ID', function() {
        var req = request('');

        it('should not be possible to update work by other user', function(done) {
            req.put(workURI)
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send({
                    alias: 'new alias'
                })
                .expect(403, done);
        });

        it('should not be possible to update a work without being logged in', function(done) {
            req.put(workURI)
                .set('Content-Type', 'application/json')
                .send({
                    alias: 'new alias'
                })
                .expect(403, done);
        });

        it('should be possible for owner to update work, resulting in new etag', function(done) {
            req.put(workURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(newWork)
                .expect(200)
                .expect(function(res) {
                    checkWork(res.body, true);

                    expect( res.header.etag ).to.not.be( origEtag );

                    expect( res.header.link ).to.not.be( undefined );
                    expect( parseLinks(res.header.link).self ).to.be( workURI );
                })
                .end(done);
        });

        it('should detect conflicting updates with etags', function(done) {
            req.put(workURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .set('If-Match', origEtag)
                .send({ alias: 'foobar' })
                .expect(412, done);
        });
    });

    describe('DELETE /works/ID', function() {
        var req = request('');

        it('should not delete works by other users', function(done) {
            req.delete(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should delete works by owner', function(done) {
            req.delete(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .end(done);
        });

        it('deleted works should not be found', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .expect(404)
                .end(done);
        });
    });
});
