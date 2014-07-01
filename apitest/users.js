/*
 * Catalog API test - users
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:apitest:users');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Users', function() {
    var userURI;  // Will be set to the URI for this user
    var origEtag; // Will be set to etag before PUT

    // Helper stuff for profile updates/checks
    var newProfile = {
        alias: util.testUser,
        profile: {
            name: 'new name',
            email: 'new@example.org',
            location: 'new location',
            website: 'http://example.org/new',
            gravatar_email: 'new-id@example.org',
        },
    };

    var checkProfile = function(u, asSelf) {
        expect( u.alias ).to.be( util.testUser );
        expect( u.profile.name ).to.be( 'new name' );
        expect( u.profile.email ).to.be( 'new@example.org' );
        expect( u.profile.location ).to.be( 'new location' );
        expect( u.profile.website ).to.be( 'http://example.org/new' );
        if (asSelf) {
            expect( u.profile.gravatar_email ).to.be( 'new-id@example.org' );
        }
        else {
            expect( u.profile.gravatar_email ).to.be( undefined );
        }
    };

    // Actual test cases

    describe('GET /users/current', function() {
        var req = request(config.frontend.baseURL);

        it('should fail when not logged in', function(done) {
            req.get('/users/current')
                .expect(403, done);
        });

        it('should redirect to profile for current user', function(done) {
            req.get('/users/current')
                .set('Authorization', util.auth(util.testUser))
                .expect(302)
                .expect('location', util.urlRE.user)
                .end(function(err, res) {
                    if (res) {
                        userURI = res.header.location;
                        debug('using %s: %s', util.testUser, userURI);
                    }
                    done(err);
                });
        });
        
    });

    describe('GET /users/ID', function() {
        var req = request('');

        it('should get id and href', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(res) {
                    var u = res.body;

                    expect( u.id ).to.be.ok();
                    expect( u.href ).to.be( userURI );
                })
                .end(done);
        });

        it('should get self link and etag', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('user link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( userURI );

                    debug('user etag: %s', res.header.etag);
                    origEtag = res.header.etag;
                })
                .end(done);
        });

        it('should include write permission for user itself', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;
                    expect( u._perms.write ).to.be.ok();
                })
                .end(done);
        });

        it('should not include write permission for other users', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;
                    expect( u._perms.write ).to.not.be.ok();
                })
                .end(done);
        });

        it('should not include write permission for anonymous users', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(res) {
                    var u = res.body;
                    expect( u._perms.write ).to.not.be.ok();
                })
                .end(done);
        });
    });

    describe('PUT /users/ID', function() {
        var req = request('');

        it('should not be possible to change another user profile', function(done) {
            req.put(userURI)
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send({
                    alias: 'new alias'
                })
                .expect(403, done);
        });

        it('should not be possible to change a profile without being logged in', function(done) {
            req.put(userURI)
                .set('Content-Type', 'application/json')
                .send({
                    alias: 'new alias'
                })
                .expect(403, done);
        });

        it('should be possible for user to update profile, resulting in new etag', function(done) {
            req.put(userURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(newProfile)
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    checkProfile(res.body, true);

                    expect( res.header.etag ).to.not.be( origEtag );

                    expect( parseLinks(res.header.link).self ).to.be( userURI );
                })
                .end(done);
        });

        it('should detect conflicting updates with etags', function(done) {
            req.put(userURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .set('If-Match', origEtag)
                .send({ alias: 'foobar' })
                .expect(412, done);
        });
    });

    describe('GET /users/ID', function() {
        var req = request('');

        it('should return full profile to the user', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    checkProfile(res.body, true);
                })
                .end(done);
        });

        it('should return public profile to other users', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(200)
                .expect(function(res) {
                    checkProfile(res.body, false);
                })
                .end(done);
        });

        it('should return public profile to anonymous users', function(done) {
            req.get(userURI)
                .set('Accept', 'application/json')
                .expect(200)
                .expect(function(res) {
                    checkProfile(res.body, false);
                })
                .end(done);
        });

    });


});
