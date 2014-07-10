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
        expect( e.events[0].event ).to.be( 'core.media.created' );
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

    it('should generate event', function() {
        var r, m, e;

        r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        r = work.command.linkMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.media.added' );
        expect( e.events[0].param ).to.have.property( 'media_id' );
        expect( e.events[0].param.media_id ).to.be( m.id );
    });
});

describe('Delete media', function() {
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

        expect( work.command.deleteMedia ).withArgs(
            otherUserContext, testWork, m
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should generate event', function() {
        var r, m, e;

        r = work.command.createMedia(testContext, testWork, {});
        expect( r ).to.have.property( 'save' );
        m = r.save;

        r = work.command.linkMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );

        r = work.command.deleteMedia(testContext, testWork, m);
        expect( r ).to.have.property( 'save' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.media.removed' );
        expect( e.events[0].param ).to.have.property( 'media_id' );
        expect( e.events[0].param.media_id ).to.be( m.id );
    });
});
