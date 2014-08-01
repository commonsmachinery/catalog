/*
 * Catalog API test - work sources
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:apitest:sources');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');
var _ = require('underscore');
var ObjectId = require('mongoose').Types.ObjectId;

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('sources', function() {

    // Helper stuff for work updates/checks

    var createSource = {
    };

    var updateSource = {
        property: {
            propertyName: 'title',
            value: 'new title'
        },
        score: 5
    };

    // create work and source (to call in before())
    var createWorkAndSource = function(done, result) {
        var workReq = request(config.frontend.baseURL);
        workReq.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({alias: 'source-' + Date.now() + '-' + util.testUser}) // create empty work with 'unique 'alias
            .expect(201)
            .expect(function(res) {
                if (res) {
                    result.workURI = res.header.location;
                    result.workID = res.body.id;
                }
            })
            .end(function() {
                var sourceWorkReq = request(config.frontend.baseURL);
                workReq.post('/works')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({alias: 'source-' + Date.now() + '-' + util.testUser}) // create empty work with 'unique 'alias
                .expect(201)
                .expect(function(res) {
                    if (res) {
                        result.sourceWorkURI = res.header.location;
                        result.sourceWorkID = res.body.id;
                    }
                })
                .end(function() {
                    var sourceReq = request(result.workURI);
                    sourceReq.post('/sources')
                        .set('Content-Type', 'application/json')
                        .set('Authorization', util.auth(util.testUser))
                        .send({source_work: result.sourceWorkID})
                        .expect(201)
                        .expect(function(res) {
                            if (res) {
                                result.sourceURI = res.header.location;
                                result.sourceID = res.body.id;
                            }
                        })
                        .end(done);
                });
            });
    };

    // Actual test cases

    describe('POST /works/{workID}/sources', function() {
        var workURI;  // Will be set to the URI for the work
        var sourceWorkID;
        var sourceURI;
        var sourceID;

        // create work for adding sources to it
        before(function(done){
            var req = request(config.frontend.baseURL);
            req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({alias: 'source-' + Date.now() + '-' + util.testUser})
            .end(function(err, res) {
                if (res) {
                    workURI = res.header.location;
                }
                return done(err);
            });
        });

        // create source work for adding sources to it
        before(function(done){
            var req = request(config.frontend.baseURL);
            req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({
                alias: 'source-' + Date.now() + '-' + util.testUser,
                description: 'source work'
            })
            .end(function(err, res) {
                if (res) {
                    sourceWorkID = res.body.id;
                }
                return done(err);
            });
        });

        it('should create new source', function(done) {
            var req = request(workURI);
            req.post('/sources')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    source_work: sourceWorkID
                })
                .expect( 201 )
                .expect( 'location', util.urlRE.source )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('using %s: %s', util.testUser, res.header.location);

                    sourceURI = res.header.location;
                    expect( parseLinks(res.header.link).self ).to.be( sourceURI );
                })
                .end(done);
        });

        it('should not create sources for non-existing works', function(done) {
            var req = request(workURI);
            req.post('/sources')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    source_work: new ObjectId().toString()
                })
                .expect( 404 )
                .end(done);
        });

        it('should not create duplicate sources', function(done) {
            var req = request(workURI);
            req.post('/sources')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    source_work: sourceWorkID
                })
                .expect( 500 )
                .end(done);
        });
    });

    describe('GET /works/ID/sources/ID', function() {
        var testObjects = {};

        // create work and source
        before(function(done) {
            createWorkAndSource(done, testObjects);
        });

        it('should get id and href', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect( s.id ).to.be.ok();
                    expect( s.href ).to.be( testObjects.sourceURI );
                })
                .end(done);
        });

        it('should get self link', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('source link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( testObjects.sourceURI );
                })
                .end(done);
        });

        it('should be possible to request specific fields only', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI + '?fields=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect( s ).to.have.property( 'added_by' );
                    expect( s ).to.not.have.property( 'property' );
                })
                .end(done);
        });

        it('should be possible to exclude specific fields', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI + '?fields=-added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect( s ).to.not.have.property( 'added_by' );
                    expect( s ).to.have.property( 'source_work' );

                })
                .end(done);
        });

        it('should allow including referenced users', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI + '?include=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect( s.added_by ).to.have.property( 'profile' );
                    expect( s.added_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });

        it('should let include override fields', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI + '?include=added_by,source_work&fields=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect( s.added_by ).to.have.property( 'profile' );
                    expect( s.source_work ).to.be( testObjects.sourceWorkID );
                })
                .end(done);
        });

        it('should not allow accessing private work sources for other users', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should not allow accessing private work sources for anonymous users', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .expect(403)
                .end(done);
        });
    }); // 'GET /works/ID/sources/ID'

    describe('GET /works/ID/sources', function() {
        var testObjects = {};

        // create work and source
        before(function(done) {
            createWorkAndSource(done, testObjects);
        });

        it('should get s list of sources', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/sources')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect (s).to.be.an( 'array' );
                    expect( s[0].href ).to.be( testObjects.sourceURI );
                })
                .end(done);
        });

        it('should support including fields', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/sources?fields=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect (s).to.be.an( 'array' );
                    expect( s[0].href ).to.be( testObjects.sourceURI );
                    expect( s[0] ).to.have.property( 'added_by' );
                    expect( s[0] ).to.not.have.property( 'source_work' );
                })
                .end(done);
        });

        it('should include references users', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/sources?include=added_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;

                    expect (s).to.be.an( 'array' );
                    expect( s[0].href ).to.be( testObjects.sourceURI );
                    expect( s[0] ).to.have.property( 'added_by' );
                    expect( s[0].added_by ).to.have.property( 'profile' );
                    expect( s[0].added_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });
    }); // 'GET /works/ID/sources'

    describe('DELETE /works/ID/sources/ID', function() {
        var testObjects = {};

        // create work and source
        before(function(done) {
            createWorkAndSource(done, testObjects);
        });

        it('should not be possible to do with other users work', function(done) {
            var req = request('');
            req.delete(testObjects.sourceURI)
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send(updateSource)
                .expect(403, done);
        });

        it('should not be possible to do without being logged in', function(done) {
            var req = request('');
            req.delete(testObjects.sourceURI)
                .set('Content-Type', 'application/json')
                .send(updateSource)
                .expect(403, done);
        });

        it('should get removed source in response', function(done) {
            var req = request('');
            req.delete(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;
                    expect( s.href ).to.be( testObjects.sourceURI );
                })
                .end(done);
        });

        it('should not find source after deletion', function(done) {
            var req = request('');
            req.get(testObjects.sourceURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(404)
                .end(done);
        });
    });

    describe('DELETE /works/ID/sources', function() {
        var testObjects = {};

        // create work and source
        before(function(done) {
            createWorkAndSource(done, testObjects);
        });

        it('should not be possible to do with other users work', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/sources")
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send(updateSource)
                .expect(403, done);
        });

        it('should not be possible to do without being logged in', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/sources")
                .set('Content-Type', 'application/json')
                .send(updateSource)
                .expect(403, done);
        });

        it('should return empty list when removing all sources', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/sources")
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;
                    expect( s ).to.be.empty();
                })
                .end(done);
        });

        it('should not find any sources after deletion', function(done) {
            var req = request('');
            req.get(testObjects.workURI + "/sources")
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var s = res.body;
                    expect( s ).to.be.empty();
                })
                .end(done);
        });
    }); // 'DELETE /works/ID/sources'

    describe('GET /works/ID', function() {
        var testObjects = {};

        // create work and source
        before(function(done) {
            createWorkAndSource(done, testObjects);
        });

        it('should include sources', function(done) {
            var req = request('');
            req.get(testObjects.workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect ( w ).to.have.property( 'sources' );
                    expect ( w.sources ).to.be.an( 'array' );
                    expect ( w.sources.length ).to.be( 1 );

                    expect ( w.sources[0] ).to.have.property( 'source_work' );
                    expect ( w.sources[0] ).to.have.property( 'added_by' );
                })
                .end(done);
        });

        it('populating sources should not be allowed', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/?include=sources.added_by,sources.source_work')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect ( w ).to.have.property( 'sources' );
                    expect ( w.sources ).to.be.an( 'array' );
                    expect ( w.sources.length ).to.be( 1 );

                    expect ( w.sources[0] ).to.have.property( 'source_work' );
                    expect ( w.sources[0].source_work ).to.be.a('string');
                    expect ( w.sources[0] ).to.have.property( 'added_by' );
                    expect ( w.sources[0].added_by ).to.be.a('string');
                })
                .end(done);
        });
    }); // 'GET /works/ID?include=sources'
});