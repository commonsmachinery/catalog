/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, before */

'use strict';

var debug = require('debug')('catalog:core:test:media'); // jshint ignore:line

// External modules
var _ = require('underscore'); // jshint ignore:line
var expect = require('expect.js');
var ObjectId = require('mongoose').Types.ObjectId;

// Catalog modules
var command = require('../../../lib/command');

// Core modules
var work = require('../lib/work.js');

describe('Create media', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'alias',
            description: 'description',
            public: false,
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should generate event', function() {
        var r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var m = r.save;
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Media' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].type ).to.be( 'media.created' );
        expect( e.events[0].param ).to.have.property( 'media' );
        expect( e.events[0].param.media.id.toString() ).to.be( m.id );
    });

    it('should set added_by and updated_by to given user', function() {
        var r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.added_by ).to.be( userId );
    });

    it('should use provided metadata', function() {
        var r = work.command.createMedia(testContext, testWork, {metadata: {src: 'test'}});

        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.metadata ).to.eql( {src: 'test'} );
    });

    it('should use provided replaces value', function() {
        var r, m;

        r = work.command.createMedia(testContext, testWork, {metadata: {src: 'test'}});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        var origId = m.id;

        r = work.command.createMedia(testContext, testWork, {replaces: origId});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        expect( m.replaces.toString() ).to.be( origId );
    });

    it('should require write to create or link media', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.createMedia ).withArgs(
            otherUserContext, testWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });

        expect( work.command.linkMedia ).withArgs(
            otherUserContext, testWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });
});

describe('Link media', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'alias',
            description: 'description',
            public: false,
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should generate event and link media', function() {
        var r, m, e, w;

        r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        r = work.command.linkMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'event' );
        expect( r ).to.have.property( 'save' );
        e = r.event;
        w = r.save;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].type ).to.be( 'work.media.added' );
        expect( e.events[0].param ).to.have.property( 'media' );
        expect( e.events[0].param.media ).to.be( m.id );

        expect( w.media ).to.have.length( 1 );
        expect( w.media[0].toString() ).to.be( m.id );
    });
});

describe('Remove media', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'alias',
            description: 'description',
            public: false,
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should require admin to delete', function() {
        var r, m;

        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        r = work.command.linkMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );

        expect( work.command.removeMedia ).withArgs(
            otherUserContext, testWork, m
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('removeMedia should generate event', function() {
        var r, m, e;

        r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        r = work.command.linkMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );

        r = work.command.removeMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].type ).to.be( 'work.media.removed' );
        expect( e.events[0].param ).to.have.property( 'media' );
        expect( e.events[0].param.media ).to.be( m.id );
    });
});

describe('Unlink all media', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'alias',
            description: 'description',
            public: false,
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should require admin to unlink all media', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.unlinkAllMedia ).withArgs(
            otherUserContext, testWork
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should generate events', function() {
        var r, m1, m2, e;

        r = work.command.createMedia(testContext, testWork, {});
        m1 = r.save;
        r = work.command.linkMedia(testContext, testWork, m1);

        r = work.command.createMedia(testContext, testWork, {});
        m2 = r.save;
        r = work.command.linkMedia(testContext, testWork, m2);

        r = work.command.unlinkAllMedia(testContext, testWork);
        expect( r ).to.have.property( 'event' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 2 );

        expect( e.events[0].type ).to.be( 'work.media.removed' );
        expect( e.events[0].param ).to.have.property( 'media' );
        expect( e.events[0].param.media.toString() ).to.be( m1.id );

        expect( e.events[1].type ).to.be( 'work.media.removed' );
        expect( e.events[1].param ).to.have.property( 'media' );
        expect( e.events[1].param.media.toString() ).to.be( m2.id );
    });
});
