/* Catalog core - Test source objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, before */

'use strict';

var debug = require('debug')('catalog:core:test:source'); // jshint ignore:line

// External modules
var _ = require('underscore'); // jshint ignore:line
var expect = require('expect.js');
var ObjectId = require('mongoose').Types.ObjectId;

// Catalog modules
var command = require('../../../lib/command');

// Core modules
var work = require('../lib/work.js');

describe('Create source', function() {
    var userId = new ObjectId();
    var testContext;
    var testWork;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {}).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should generate event', function() {
        var sourceWork = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;
        var createSource = {
            source_work: sourceWork.id
        };

        var r = work.command.createWorkSource(testContext, testWork, createSource);
        expect( r ).to.have.property( 'event' );
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.source.added' );
        expect( e.events[0].param ).to.have.property( 'source' );
    });

    it('should set added_by to given user', function() {
        var sourceWork = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;
        var createSource = {
            source_work: sourceWork.id
        };

        var r = work.command.createWorkSource(testContext, testWork, createSource);
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var s = r.event.events[0].param.source;

        expect( s.added_by.toString() ).to.be( userId.toString() );
    });

    it('should use provided source_work id', function() {
        var sourceWork = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;
        var createSource = {
            source_work: sourceWork.id
        };

        var r = work.command.createWorkSource(testContext, testWork, createSource);
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var s = r.event.events[0].param.source;

        expect( s ).to.have.property( 'source_work' );
        expect( s.source_work.toString() ).to.be( sourceWork.id );
    });

    it('should require write to create source', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.createWorkSource ).withArgs(
            otherUserContext, testWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should require source_work to be set', function() {
        expect( work.command.createWorkSource ).withArgs(
            testContext, testWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.CommandError ); });
    });

    it('should discard duplicate source_work', function() {
        var sourceWork = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;
        var createSource = {
            source_work: sourceWork.id
        };

        work.command.createWorkSource(testContext, testWork, createSource);

        expect( work.command.createWorkSource ).withArgs(
            testContext, testWork, createSource
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.CommandError ); });
    });
});

describe('Remove source', function() {
    var userId = new ObjectId();
    var testContext;
    var testWork;
    var sourceWork1, sourceWork2;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {}).save;

        sourceWork1 = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;

        sourceWork2 = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should require write to delete', function() {
        var r, s;

        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        r = work.command.createWorkSource(testContext, testWork, { source_work: sourceWork1.id });
        expect( r ).to.have.property( 'save' );
        s = r.event.events[0].param.source;

        expect( work.command.removeWorkSource ).withArgs(
            otherUserContext, testWork, s
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should generate event', function() {
        var r, s, e;

        r = work.command.createWorkSource(testContext, testWork, { source_work: sourceWork2.id });
        expect( r ).to.have.property( 'save' );
        s = r.event.events[0].param.source;

        r = work.command.removeWorkSource(testContext, testWork, s);
        expect( r ).to.have.property( 'save' );
        e = r.event;
        s = r.event.events[0].param.source;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.source.removed' );
        expect( s ).to.have.property( 'id' );
        expect( s.id ).to.be( s.id );
    });
});

describe('Remove all sources', function() {
    var userId = new ObjectId();
    var testContext;
    var testWork;
    var sourceWork1, sourceWork2;

    before(function() {
        testWork = work.command.create({ userId: new ObjectId() }, {}).save;

        sourceWork1 = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;

        sourceWork2 = work.command.create({ userId: new ObjectId() }, {
            description: 'source work',
        }).save;

        testContext = { userId: userId, perms: {} };

        testContext.perms[testWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    it('should require write to remove all sources', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.removeAllSources ).withArgs(
            otherUserContext, testWork
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should generate events', function() {
        var r, s1, s2, e;

        r = work.command.createWorkSource(testContext, testWork, { source_work: sourceWork1.id });
        s1 = r.event.events[0].param.source;

        r = work.command.createWorkSource(testContext, testWork, { source_work: sourceWork2.id });
        s2 = r.event.events[0].param.source;

        r = work.command.removeAllSources(testContext, testWork);
        expect( r ).to.have.property( 'event' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 2 );

        expect( e.events[0].event ).to.be( 'core.work.source.removed' );
        expect( e.events[0].param ).to.have.property( 'source' );
        expect( e.events[0].param.source.id.toString() ).to.be( s1.id.toString() );

        expect( e.events[1].event ).to.be( 'core.work.source.removed' );
        expect( e.events[1].param ).to.have.property( 'source' );
        expect( e.events[1].param.source.id.toString() ).to.be( s2.id.toString() );
    });
});
