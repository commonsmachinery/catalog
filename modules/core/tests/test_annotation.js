/* Catalog core - Test annotation objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, before */

'use strict';

var debug = require('debug')('catalog:core:test:annotation'); // jshint ignore:line

// External modules
var _ = require('underscore'); // jshint ignore:line
var expect = require('expect.js');
var ObjectId = require('mongoose').Types.ObjectId;

// Catalog modules
var command = require('../../../lib/command');

// Core modules
var work = require('../lib/work.js');

describe('Create annotation', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    var createAnnotation = {
        property: {
            propertyName: 'title',
            value: 'test title'
        }
    };

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
        var r = work.command.createWorkAnnotation(testContext, testWork, createAnnotation);
        expect( r ).to.have.property( 'event' );
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.annotation.added' );
        expect( e.events[0].param ).to.have.property( 'annotation' );
    });

    it('should set updated_by to given user', function() {
        var r = work.command.createWorkAnnotation(testContext, testWork, createAnnotation);
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var a = r.event.events[0].param.annotation;

        expect( a.updated_by.toString() ).to.be( userId.toString() );
    });

    it('should use provided property', function() {
        var r = work.command.createWorkAnnotation(testContext, testWork, createAnnotation);
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var a = r.event.events[0].param.annotation;

        expect( a ).to.have.property( 'property' );
        expect( a.property.value ).to.be( 'test title' );
    });

    it('should require write to create annotation', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.createWorkAnnotation ).withArgs(
            otherUserContext, testWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });
});

describe('Remove annotation', function() {
    var userId = new ObjectId();
    var testWork;
    var testContext;

    var createAnnotation = {
        property: {
            propertyName: 'title',
            value: 'test title'
        }
    };

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
        var r, a;

        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        r = work.command.createWorkAnnotation(testContext, testWork, createAnnotation);
        expect( r ).to.have.property( 'save' );
        a = r.event.events[0].param.annotation;

        expect( work.command.removeWorkAnnotation ).withArgs(
            otherUserContext, testWork, a
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('removeAnnotation should generate event', function() {
        var r, a, e;

        r = work.command.createWorkAnnotation(testContext, testWork, createAnnotation);
        expect( r ).to.have.property( 'save' );
        a = r.event.events[0].param.annotation;

        r = work.command.removeWorkAnnotation(testContext, testWork, a);
        expect( r ).to.have.property( 'save' );
        e = r.event;
        a = r.event.events[0].param.annotation;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.annotation.removed' );
        expect( a ).to.have.property( 'id' );
        expect( a.id ).to.be( a.id );
    });
});

describe('Remove all annotations', function() {
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

    it('should require admin to remove all annotations', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.removeAllAnnotations ).withArgs(
            otherUserContext, testWork
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should generate events', function() {
        var r, a1, a2, e;

        r = work.command.createWorkAnnotation(testContext, testWork, {});
        a1 = r.event.events[0].param.annotation;

        r = work.command.createWorkAnnotation(testContext, testWork, {});
        a2 = r.event.events[0].param.annotation;

        r = work.command.removeAllAnnotations(testContext, testWork);
        expect( r ).to.have.property( 'event' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 2 );

        expect( e.events[0].event ).to.be( 'core.work.annotation.removed' );
        expect( e.events[0].param ).to.have.property( 'annotation' );
        expect( e.events[0].param.annotation.id.toString() ).to.be( a1.id.toString() );

        expect( e.events[1].event ).to.be( 'core.work.annotation.removed' );
        expect( e.events[1].param ).to.have.property( 'annotation' );
        expect( e.events[1].param.annotation.id.toString() ).to.be( a2.id.toString() );
    });
});
