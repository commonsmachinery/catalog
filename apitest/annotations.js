/*
 * Catalog API test - work annotations
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:apitest:annotations');

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


describe('annotations', function() {

    // Helper stuff for work updates/checks

    var createAnnotation = {
        property: {
            propertyName: 'title',
            value: 'example title'
        }
    };

    var updateAnnotation = {
        property: {
            propertyName: 'title',
            value: 'new title'
        },
        score: 5
    };

    // create work and annotation (to call in before())
    var createWorkAndAnnotation = function(done, result) {
        var workReq = request(config.frontend.baseURL);
        workReq.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({alias: 'anno-' + Date.now() + '-' + util.testUser}) // create empty work with 'unique 'alias
            .expect(201)
            .expect(function(res) {
                if (res) {
                    result.workURI = res.header.location;
                }
            })
            .end(function() {
                var annoReq = request(result.workURI);
                annoReq.post('/annotations')
                    .set('Content-Type', 'application/json')
                    .set('Authorization', util.auth(util.testUser))
                    .send(createAnnotation)
                    .expect(201)
                    .expect(function(res) {
                        if (res) {
                            result.annotationURI = res.header.location;
                            result.annotationID = res.body.id;
                        }
                    })
                    .end(done);
            });
    };

    // Actual test cases

    describe('POST /works/{workID}/annotations', function() {
        var workURI;  // Will be set to the URI for the work
        var annotationURI;
        var annotationID;

        // create work for adding annotations to it
        before(function(done){
            var req = request(config.frontend.baseURL);
            req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({alias: 'anno-' + Date.now() + '-' + util.testUser})
            .end(function(err, res) {
                if (res) {
                    workURI = res.header.location;
                }
                return done(err);
            });
        });

        it('should create new annotation', function(done) {
            var req = request(workURI);
            req.post('/annotations')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(createAnnotation)
                .expect( 201 )
                .expect( 'location', util.urlRE.annotation )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('using %s: %s', util.testUser, res.header.location);

                    annotationURI = res.header.location;
                    expect( parseLinks(res.header.link).self ).to.be( annotationURI );
                })
                .end(done);
        });
    });

    describe('GET /works/ID/annotations/ID', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        it('should get id and href', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect( a.id ).to.be.ok();
                    expect( a.href ).to.be( testObjects.annotationURI );
                })
                .end(done);
        });

        it('should get self link', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('annotation link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( testObjects.annotationURI );
                })
                .end(done);
        });

        it('should be possible to request specific fields only', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI + '?fields=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect( a ).to.have.property( 'updated_by' );
                    expect( a ).to.not.have.property( 'property' );
                })
                .end(done);
        });

        it('should be possible to exclude specific fields', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI + '?fields=-updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect( a ).to.not.have.property( 'updated_by' );
                    expect( a ).to.have.property( 'property' );

                })
                .end(done);
        });

        it('should allow including referenced users', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI + '?include=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect( a.updated_by ).to.have.property( 'profile' );
                    expect( a.updated_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });

        it('should let include override fields', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI + '?include=updated_by,property&fields=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect( a.updated_by ).to.have.property( 'profile' );
                    expect( a.property ).to.have.property( 'propertyName' );
                })
                .end(done);
        });

        it('should not allow accessing private work annotations for other users', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(403)
                .end(done);
        });

        it('should not allow accessing private work annotations for anonymous users', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .expect(403)
                .end(done);
        });
    }); // 'GET /works/ID/annotations/ID'

    describe('GET /works/ID/annotations', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        it('should get a list of annotations', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/annotations')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect (a).to.be.an( 'array' );
                    expect( a[0].href ).to.be( testObjects.annotationURI );
                })
                .end(done);
        });

        it('should support including fields', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/annotations?fields=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect (a).to.be.an( 'array' );
                    expect( a[0].href ).to.be( testObjects.annotationURI );
                    expect( a[0] ).to.have.property( 'updated_by' );
                    expect( a[0] ).to.not.have.property( 'property' );
                })
                .end(done);
        });

        it('should include references users', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/annotations?include=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect (a).to.be.an( 'array' );
                    expect( a[0].href ).to.be( testObjects.annotationURI );
                    expect( a[0] ).to.have.property( 'updated_by' );
                    expect( a[0].updated_by ).to.have.property( 'profile' );
                    expect( a[0].updated_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });
    }); // 'GET /works/ID/annotations'

    describe('PUT /works/ID/annotations/ID', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        it('should not be possible to update annotation in other users work', function(done) {
            var req = request('');
            req.put(testObjects.annotationURI)
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should not be possible to update annotation without being logged in', function(done) {
            var req = request('');
            req.put(testObjects.annotationURI)
                .set('Content-Type', 'application/json')
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should be possible for owner to update work annotation', function(done) {
            var req = request('');
            req.put(testObjects.annotationURI)
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(updateAnnotation)
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'score' );
                    expect ( a ).to.have.property( 'property' );
                    expect ( a.score ).to.be( 5 );
                    expect ( a.property.value ).to.be( 'new title' );
                })
                .end(done);
        });
    }); // 'PUT /works/ID/annotations/ID'

    describe('DELETE /works/ID/annotations/ID', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        it('should not be possible to do with other users work', function(done) {
            var req = request('');
            req.delete(testObjects.annotationURI)
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should not be possible to do without being logged in', function(done) {
            var req = request('');
            req.delete(testObjects.annotationURI)
                .set('Content-Type', 'application/json')
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should get removed annotation in response', function(done) {
            var req = request('');
            req.delete(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;
                    expect( a.href ).to.be( testObjects.annotationURI );
                })
                .end(done);
        });

        it('should not find annotation after deletion', function(done) {
            var req = request('');
            req.get(testObjects.annotationURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(404)
                .end(done);
        });
    });

    describe('DELETE /works/ID/annotations', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        it('should not be possible to do with other users work', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/annotations")
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should not be possible to do without being logged in', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/annotations")
                .set('Content-Type', 'application/json')
                .send(updateAnnotation)
                .expect(403, done);
        });

        it('should return empty list when removing all annotations', function(done) {
            var req = request('');
            req.delete(testObjects.workURI + "/annotations")
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;
                    expect( a ).to.be.empty();
                })
                .end(done);
        });

        it('should not find any annotations after deletion', function(done) {
            var req = request('');
            req.get(testObjects.workURI + "/annotations")
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;
                    expect( a ).to.be.empty();
                })
                .end(done);
        });
    }); // 'DELETE /works/ID/annotations'

    describe('GET /works/ID?annotations', function() {
        var testObjects = {};

        // create work and annotation
        before(function(done) {
            createWorkAndAnnotation(done, testObjects);
        });

        // add extra annotations
        before(function(done) {
            var annoReq = request(testObjects.workURI);
            annoReq.post('/annotations')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    property: {
                        propertyName: 'title',
                        value: 'new title'
                    },
                    score: 5
                })
                .expect(201)
                .end(done);
        });

        // add extra annotations
        before(function(done) {
            var annoReq = request(testObjects.workURI);
            annoReq.post('/annotations')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    property: {
                        propertyName: 'creator',
                        value: 'bob'
                    },
                    score: 0
                })
                .expect(201)
                .end(done);
        });

        it('?annotations should return annotations as a map', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/?annotations=title')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'annotations' );
                    expect ( a.annotations ).to.have.property( 'title' );
                    expect ( a.annotations ).to.not.have.property( 'creator' );
                    expect ( a.annotations.title ).to.be.an( 'array' );

                    expect ( a.annotations.title[0] ).to.have.property( 'score' );
                    expect ( a.annotations.title[0] ).to.have.property( 'property' );
                    expect ( a.annotations.title[0].score ).to.be( 5 );
                    expect ( a.annotations.title[0].property.value ).to.be( 'new title' );
                })
                .end(done);
        });

        it('?annotations=all should return all annotations as a map', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/?annotations=title,creator')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'annotations' );
                    expect ( a.annotations ).to.have.property( 'title' );
                    expect ( a.annotations ).to.have.property( 'creator' );
                    expect ( a.annotations.title ).to.be.an( 'array' );
                    expect ( a.annotations.creator ).to.be.an( 'array' );
                })
                .end(done);
        });

        it('include=annotations.updated_by should fill updated_by', function(done) {
            var req = request('');
            req.get(testObjects.workURI + '/?annotations=title&include=annotations.updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'annotations' );
                    expect ( a.annotations ).to.have.property( 'title' );
                    expect ( a.annotations.title ).to.be.an( 'array' );
                    expect ( a.annotations.title[0] ).to.have.property( 'updated_by' );
                    expect ( a.annotations.title[0].updated_by ).to.have.property( 'profile' );
                })
                .end(done);
        });
    }); // 'GET /works/ID?annotations'

    describe('GET /works/ID/media/ID?annotations', function() {
        var workURI;
        var mediaURI;

        // create work for adding media
        before(function(done){
            var req = request(config.frontend.baseURL);
            req.post('/works')
            .set('Content-Type', 'application/json')
            .set('Authorization', util.auth(util.testUser))
            .send({alias: 'anno-' + Date.now() + '-' + util.testUser})
            .expect(201)
            .end(function(err, res) {
                if (res) {
                    workURI = res.header.location;
                }
                return done(err);
            });
        });

        // create media
        before(function(done){
            var req = request(workURI);
            req.post('/media')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send({
                    metadata: { src: "test" },
                    annotations: [{
                        property: {
                            propertyName: 'title',
                            value: 'media title'
                        }
                    }, {
                        property: {
                            propertyName: 'creator',
                            value: 'media creator'
                        }
                    }]
                })
                .expect(201)
                .end(function(err, res) {
                    if (res) {
                        mediaURI = res.header.location;
                    }
                    return done(err);
                });
        });

        it('media?annotations should be returned as map', function(done) {
            var req = request('');
            req.get(mediaURI + '/?annotations=title')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'annotations' );
                    expect ( a.annotations ).to.have.property( 'title' );
                    expect ( a.annotations ).to.not.have.property( 'creator' );
                })
                .end(done);
        });

        it('media?annotations=all should return all annotations', function(done) {
            var req = request('');
            req.get(mediaURI + '/?annotations=all')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var a = res.body;

                    expect ( a ).to.have.property( 'annotations' );
                    expect ( a.annotations ).to.have.property( 'title' );
                    expect ( a.annotations ).to.have.property( 'creator' );
                })
                .end(done);
        });
    }); // 'GET /works/ID/media/ID?annotations'
});