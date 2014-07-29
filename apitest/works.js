/*
 * Catalog API test - works
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

/* global describe, it, before, after */

'use strict';

var debug = require('debug')('catalog:apitest:works');

// External libs
var request = require('supertest');
var expect = require('expect.js');
var parseLinks = require('parse-links');
var url = require('url');

// Common libs
var config = require('../lib/config');

// Apitest libs
var util = require('./lib/util');


describe('Works', function() {
    var workID;   // Will be set to the ID for this work
    var workURI;  // Will be set to the URI for this work
    var origEtag; // Will be set to etag before PUT

    // Helper stuff for work updates/checks
    var createWork = {
        // Use unique user ID in alias to avoid hitting duplicate keys
        alias: 'orig-' + util.testUser,
        description: 'description',
        public: false,
/*
        annotations: [{
            score: 100,
            property: {
                propertyName: 'title',
                titleLabel: 'test',
                value: 'test',
            },
        }],
*/
    };

    var updateWork = {
        alias: 'new-' + util.testUser,
        description: 'new description',
        public: true,
    };

    var checkWork = function(w, expected) {
        expect( w.alias ).to.be( expected.alias );
        expect( w.description ).to.be( expected.description );
        expect( w.public ).to.be( expected.public );
/*
        expect( w ).to.have.property( 'annotations' );
        expect( w.annotations.length ).to.be( 1 );
        expect( w.annotations[0].score ).to.be( 100 );
        expect( w.annotations[0].property.propertyName ).to.be( 'title' );
        expect( w.annotations[0].property.titleLabel ).to.be( 'test' );
        expect( w.annotations[0].property.value ).to.be( 'test' );
*/
    };

    // Actual test cases

    describe('POST /works', function() {
        var req = request(config.frontend.baseURL);

        it('should create new work', function(done) {
            req.post('/works')
                .set('Content-Type', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .send(createWork)
                .expect( 201 )
                .expect( 'etag', util.etagRE )
                .expect( 'location', util.urlRE.work )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    workURI = res.header.location;
                    debug('using %s: %s', util.testUser, workURI);

                    expect( parseLinks(res.header.link).self ).to.be( workURI );

                    debug('work etag: %s', res.header.etag);

                    checkWork(res.body, createWork);
                })
                .end(done);
        });

    });

    describe('GET /works/ID', function() {
        var req = request('');

        it('should get id and href', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;

                    expect( u.id ).to.be.ok();
                    expect( u.href ).to.be( workURI );

                    workID = res.body.id;
                })
                .end(done);
        });

        it('should get users as id and href', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;

                    expect( u.owner.user ).to.have.property( 'id' );
                    expect( u.owner.user.href ).to.match( util.urlRE.user );

                    expect( u.added_by ).to.have.property( 'id' );
                    expect( u.added_by.href ).to.be.match( util.urlRE.user );

                    expect( u.updated_by ).to.have.property( 'id' );
                    expect( u.updated_by.href ).to.be.match( util.urlRE.user );
                })
                .end(done);
        });

        it('should get self link and etag', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    debug('work link: %s', res.header.link);
                    expect( parseLinks(res.header.link).self ).to.be( workURI );

                    debug('work etag: %s', res.header.etag);
                    origEtag = res.header.etag;
                })
                .end(done);
        });

        it('should be possible to request specific fields only', function(done) {
            req.get(workURI + '?fields=owner,description')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;
                    expect( u.id ).to.be( workID );
                    expect( u.href ).to.be( workURI );
                    expect( u ).to.have.property( '_perms' );

                    expect( u.owner ).to.have.property( 'user' );
                    expect( u.alias ).to.be( undefined );
                    expect( u.description ).to.be( 'description' );
                    expect( u.added_by ).to.be( undefined );
                    expect( u.updated_by ).to.be( undefined );
                })
                .end(done);
        });

        it('should be possible to exclude specific fields', function(done) {
            req.get(workURI + '?fields=-owner,description')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;
                    expect( u.id ).to.be( workID );
                    expect( u.href ).to.be( workURI );
                    expect( u ).to.have.property( '_perms' );

                    expect( u.owner ).to.be( undefined );
                    expect( u.alias ).to.be( createWork.alias );
                    expect( u.description ).to.be( undefined );
                    expect( u.added_by ).to.have.property( 'id' );
                    expect( u.updated_by ).to.have.property( 'id' );
                })
                .end(done);
        });

        it('should allow including referenced users', function(done) {
            req.get(workURI + '?include=owner,added_by,updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;

                    expect( u.owner.user ).to.have.property( 'profile' );
                    expect( u.owner.user.profile ).to.have.property( 'gravatar_hash' );

                    expect( u.added_by ).to.have.property( 'profile' );
                    expect( u.added_by.profile ).to.have.property( 'gravatar_hash' );

                    expect( u.updated_by ).to.have.property( 'profile' );
                    expect( u.updated_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });

        it('should let include override fields', function(done) {
            req.get(workURI + '?include=added_by,updated_by&fields=updated_by')
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var u = res.body;

                    expect( u.owner ).to.be( undefined );

                    expect( u.added_by ).to.have.property( 'profile' );
                    expect( u.added_by.profile ).to.have.property( 'gravatar_hash' );

                    expect( u.updated_by ).to.have.property( 'profile' );
                    expect( u.updated_by.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });


        it('should include write and admin permission for owner', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.testUser))
                .expect(200)
                .expect(function(res) {
                    var w = res.body;
                    expect( w._perms.write ).to.be.ok();
                    expect( w._perms.admin ).to.be.ok();
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

    describe('PUT /works/ID', function() {
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
                .send(updateWork)
                .expect(200)
                .expect( 'etag', util.etagRE )
                .expect( 'link', /rel="self"/ )
                .expect(function(res) {
                    checkWork(res.body, updateWork);

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

    describe('GET /works/ID', function() {
        var req = request('');

        it('should now allow accessing public work for other users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .set('Authorization', util.auth(util.otherUser))
                .expect(200)
                .end(done);
        });

        it('should now allow accessing public work for anonymous users', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .expect(200)
                .end(done);
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
                .expect(function(res) {
                    checkWork(res.body, updateWork);
                })
                .end(done);
        });

        it('deleted works should not be found', function(done) {
            req.get(workURI)
                .set('Accept', 'application/json')
                .expect(404)
                .end(done);
        });
    });

    describe('GET /works', function() {
        var owner1 = util.auth('owner1-' + Date.now());
        var owner2 = util.auth('owner2-' + Date.now());

        var ownerIDs = [];
        var workIDs = [];
        var workURIs = [];
        var mediaID;

        var createListWork = function(owner, send, done) {
            return function() {
                var workReq = request(config.frontend.baseURL);
                workReq.post('/works')
                    .set('Content-Type', 'application/json')
                    .set('Authorization', owner)
                    .send(send)
                    .expect(201)
                    .expect(function(res) {
                        if (res) {
                            workURIs.push(res.header.location);
                            workIDs.push(res.body.id);
                            ownerIDs.push(res.body.owner.user.id);
                        }
                    }).end(done);
            };
        };

        // create some works
        before(function(done) {
            createListWork(owner1, {
                    alias: 'list1-' + Date.now()
                }, createListWork(owner1, {
                        alias: 'list2-' + Date.now(),
                        public: true,
                    }, createListWork(owner2, {
                            alias: 'list3-' + Date.now(),
                        }, createListWork(owner1, {
                                alias: 'list4-' + Date.now(),
                            }, done))))();
        });

        // create media
        before(function(done) {
            var req = request(workURIs[0]);
            req.post('/media')
                .set('Content-Type', 'application/json')
                .set('Authorization', owner1)
                .send({metadata: { src: "test" }})
                .expect( 201 )
                .expect(function(res) {
                    mediaID = res.body.id;
                })
                .end(done);
        });

        it('should filter works by owner', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0])
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 3 );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[0] );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[1] );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[3] );
                })
                .end(done);
        });

        it('should list public works by other users', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0])
                .set('Accept', 'application/json')
                .set('Authorization', owner2)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 1 );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[0] );
                })
                .end(done);
        });

        it('should list public works when not logged in', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0])
                .set('Accept', 'application/json')
                //.set('Authorization', owner2)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 1 );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[0] );
                })
                .end(done);
        });

        it('should filter works by media', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=media:' + mediaID)
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 1 );
                    expect( w[0].media[0] ).to.equal( mediaID );
                })
                .end(done);
        });

        it('should sort works by date added', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&sort=added_at")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 3 );

                    expect ( w[0].added_at ).to.be.lessThan ( w[1].added_at );
                    expect ( w[1].added_at ).to.be.lessThan ( w[2].added_at );

                })
                .end(done);
        });

        it('should sort works by date updated', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&sort=added_at")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 3 );

                    expect ( w[0].updated_at ).to.be.lessThan ( w[1].updated_at );
                    expect ( w[1].updated_at ).to.be.lessThan ( w[2].updated_at );

                })
                .end(done);
        });

        it('should sort in reverse order', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&sort=-added_at")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 3 );

                    expect ( w[0].added_at ).to.be.greaterThan ( w[1].added_at );
                    expect ( w[1].added_at ).to.be.greaterThan ( w[2].added_at );

                })
                .end(done);
        });

        it('should not allow too many pages per request', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&per_page=2000")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(500)
                .end(done);
        });

        it('should not allow bogus page number', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&page=-1")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(500)
                .end(done);
        });

        it('should support paging', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&page=2&per_page=2")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w.length ).to.equal( 1 );

                    var links = parseLinks(res.header.link);
                    expect( links ).to.have.property( 'first' );
                    expect( links ).to.have.property( 'next' );
                    expect( links ).to.have.property( 'previous' );

                    var linkObj = url.parse(links.first, true);
                    expect( linkObj.query ).to.have.property( 'page' );
                    expect( linkObj.query.page ).to.be( '1' );

                    linkObj = url.parse(links.previous, true);
                    expect( linkObj.query ).to.have.property( 'page' );
                    expect( linkObj.query.page ).to.be( '1' );

                    linkObj = url.parse(links.next, true);
                    expect( linkObj.query ).to.have.property( 'page' );
                    expect( linkObj.query.page ).to.be( '3' );
                })
                .end(done);
        });

        it('should allow including fields', function(done) {
            var req = request(config.frontend.baseURL);
            req.get('/works?filter=owner.user:' + ownerIDs[0] + "&include=owner")
                .set('Accept', 'application/json')
                .set('Authorization', owner1)
                .expect(200)
                .expect(function(res) {
                    var w = res.body;

                    expect( w ).to.be.an( 'array' );
                    expect( w[0].owner.user.id ).to.equal( ownerIDs[0] );
                    expect( w[0].owner.user ).to.have.property( 'profile' );
                    expect( w[0].owner.user.profile ).to.have.property( 'gravatar_hash' );
                })
                .end(done);
        });
    }); // list works
});
