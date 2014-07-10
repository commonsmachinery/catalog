/*
 * Catalog API test - work media
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:apitest:media');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');
var _ = require('underscore');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Media', function() {
    var workURI;  // Will be set to the URI for the work
    var mediaURI;  // Will be set to the URI for the media
    var mediaID;  // Will be set to the ID for the media
    var replacementMediaURI; // Will be set to the ID for the replacement media

    // Helper stuff for work updates/checks
    var createWork = {
        // Use unique user ID in alias to avoid hitting duplicate keys
        alias: 'media-' + util.testUser,
        description: 'description',
        public: false,
    };

    var createMedia = {
        metadata: { src: "test" }
    };

    var createReplacementMedia = {
        metadata: { src: "newsrc" }
    };

    // Actual test cases

    // create work for testing media
    before(function(done){
        var req = request(config.frontend.baseURL);

        req.post('/works')
        .set('Content-Type', 'application/json')
        .set('Authorization', util.auth(util.testUser))
        .send(createWork)
        .end(function(err, res) {
            if (res) {
                workURI = res.header.location;
            }
            return done(err);
        });
    });

    describe('POST /works/{workID}/media', function() {
        it('should create new media', function(done) {
            var req = request(workURI);
            req.post('/media')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(createMedia)
                .expect( 201 )
                .expect( 'etag', util.etagRE )
                .expect( 'location', util.urlRE.media )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    mediaURI = res.header.location;
                    debug('using %s: %s', util.testUser, mediaURI);

                    expect( parseLinks(res.header.link).self ).to.be( mediaURI );

                    debug('media etag: %s', res.header.etag);

                    //checkWork(res.body, createWork);*/
                })
                .end(done);
        });
    });

    describe('GET /works/ID/media/ID', function() {
        var req = request('');

        it('should get id and href', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;

                    expect( m.id ).to.be.ok();
                    expect( m.href ).to.be( mediaURI );

                    mediaID = res.body.id;
                })
                .end(done);
        });

        it('should get users as id and href', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;

                    expect( m.added_by ).to.have.property( 'id' );
                    expect( m.added_by.href ).to.be.match( util.urlRE.user );
                })
                .end(done);
        });

        it('should get self link and etag', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('media link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( mediaURI );

                    debug('media etag: %s', res.header.etag);
                    //origEtag = res.header.etag;
                })
                .end(done);
        });

        it('should be possible to request specific fields only', function(done) {
            req.get(mediaURI + '?fields=metadata')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;
                    expect( m.id ).to.be( mediaID );
                    expect( m.href ).to.be( mediaURI );

                    expect( m ).to.have.property( 'metadata' );
                    expect( m.metadata ).to.have.property( 'src' );
                    expect( m.added_by ).to.be( undefined );
                })
                .end(done);
        });

        it('should be possible to exclude specific fields', function(done) {
            req.get(mediaURI + '?fields=-metadata')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;
                    expect( m.id ).to.be( mediaID );
                    expect( m.href ).to.be( mediaURI );

                    expect( m.metadata ).to.be( undefined );
                })
                .end(done);
        });

        it('should allow including referenced users', function(done) {
            req.get(mediaURI + '?include=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;

                    expect( m.added_by ).to.have.property( 'profile' );
                    expect( m.added_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });

        it('should let include override fields', function(done) {
            req.get(mediaURI + '?include=added_by,metadata&fields=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;

                    expect( m.added_by ).to.have.property( 'profile' );
                    expect( m.metadata ).to.have.property( 'src' );
                })
                .end(done);
        });

        it('should not allow accessing private work media for other users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should not allow accessing private work media for anonymous users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .expect(403)
                .end(done);
        });
    });

    describe('Public work media', function() {
        var req = request('');

        // update work to become public
        before(function(done){
            var req = request('');
            req.put(workURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({public: true})
                .end(function(err, res) {
                    return done(err);
                });
        });

        it('should now allow accessing public work media for other users', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(200)
                .end(done);
        });

        it('should now allow accessing public work media for anonymous users', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .expect(200)
                .end(done);
        });
    });

    describe('Replacing media', function() {
        // create replacement media
        before(function(done){
            var req = request(workURI);
            req.post('/media')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(_.extend(createReplacementMedia, {replaces: mediaID}))
                .end(function(err, res) {
                    if (res) {
                        replacementMediaURI = res.header.location;
                    }
                    return done(err);
                });
        });

        it('should allow including referenced media', function(done) {
            var req = request('');
            req.get(replacementMediaURI + '?include=replaces')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;

                    expect( m ).to.have.property( 'replaces' );
                    expect( m.replaces ).to.have.property( 'metadata' );
                })
                .end(done);
        });
    });

    describe('DELETE /works/ID/media/ID', function() {
        var req = request('');

        it('should not delete media from works by other users', function(done) {
            req.delete(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should delete media from works by owner', function(done) {
            req.delete(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .end(done);
        });

        it('deleted media should not be found', function(done) {
            req.get(mediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(404)
                .end(done);
        });

        it('should return empty list when unlinking all media', function(done) {
            req.delete(workURI + "/media")
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var m = res.body;
                    expect( JSON.stringify(m) ).to.be( '[]' );
                })
                .end(done);
        });

        it('remaining media should not be found', function(done) {
            req.get(replacementMediaURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(404)
                .end(done);
        });
    });
});
