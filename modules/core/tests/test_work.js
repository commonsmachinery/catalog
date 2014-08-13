/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, before, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:core:test:work'); // jshint ignore:line

// External modules
var _ = require('underscore');
var expect = require('expect.js');
var ObjectId = require('mongoose').Types.ObjectId;

// Catalog modules
var command = require('../../../lib/command');

// Core modules
var work = require('../lib/work.js');

describe('User permissions', function() {
    var userId = new ObjectId();

    var publicWork = {
        id: 'test', owner: { user: userId }, public: true };
    var privateWork = {
        id: 'test', owner: { user: userId }, public: false };

    describe('for public works', function() {
        it('should let anonymous users read', function() {
            var context = {};
            work.setWorkPerms(context)(publicWork);

            expect( context.perms.test.read ).to.be.ok();
            expect( context.perms.test.write ).to.not.be.ok();
            expect( context.perms.test.admin ).to.not.be.ok();
        });

        it('should let other users read', function() {
            var context = { userId: new ObjectId() };
            work.setWorkPerms(context)(publicWork);

            expect( context.perms.test.read ).to.be.ok();
            expect( context.perms.test.write ).to.not.be.ok();
            expect( context.perms.test.admin ).to.not.be.ok();
        });

        it('should let owner user do everything', function() {
            var context = { userId: userId };
            work.setWorkPerms(context)(publicWork);

            expect( context.perms.test.read ).to.be.ok();
            expect( context.perms.test.write ).to.be.ok();
            expect( context.perms.test.admin ).to.be.ok();
        });
    });

    describe('for private works', function() {
        it('should not let anonymous users do anything', function() {
            var context = {};
            work.setWorkPerms(context)(privateWork);

            expect( context.perms.test.read ).to.not.be.ok();
            expect( context.perms.test.write ).to.not.be.ok();
            expect( context.perms.test.admin ).to.not.be.ok();
        });

        it('should not let other users read', function() {
            var context = { userId: new ObjectId() };
            work.setWorkPerms(context)(privateWork);

            expect( context.perms.test.read ).to.not.be.ok();
            expect( context.perms.test.write ).to.not.be.ok();
            expect( context.perms.test.admin ).to.not.be.ok();
        });

        it('should let owner user do everything', function() {
            var context = { userId: userId };
            work.setWorkPerms(context)(privateWork);

            expect( context.perms.test.read ).to.be.ok();
            expect( context.perms.test.write ).to.be.ok();
            expect( context.perms.test.admin ).to.be.ok();
        });
    });
});

describe('Create work', function() {
    var userId = new ObjectId();
    var context = { userId: userId };

    it('should generate events', function() {
        var r = work.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var m = r.save;
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.created' );
        expect( e.events[0].param ).to.have.property( 'work' );
        expect( e.events[0].param.work.id.toString() ).to.be( m.id );
    });

    it('should set added_by and updated_by to given user', function() {
        var r = work.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.added_by ).to.be( userId );
        expect( m.updated_by ).to.be( userId );
    });


    it('should make new work private by default', function() {
        var r = work.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.public ).to.be( false );
    });

    it('should use provided simple properties', function() {
        var r = work.command.create(context, {
            'alias': 'alias',
            'description': 'desc',
            public: true,
        });

        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.alias ).to.be( 'alias' );
        expect( m.description ).to.be( 'desc' );
        expect( m.public ).to.be( true );
    });
});


describe('Update work', function() {
    var userId = new ObjectId();
    var oldWork;
    var writeContext;

    /* Create a object to be updated as another user to allow correct
     * context handling to be tested. */
    beforeEach(function() {
        oldWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'old alias',
            description: 'old description',
            public: false,
        }).save;

        writeContext = { userId: userId, perms: {} };

        writeContext.perms[oldWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    afterEach(function() {
        oldWork = null;
    });

    it('should require write to update', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.update ).withArgs(
            otherUserContext, oldWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should reject conflicts when requesting specific version', function() {
        var versionContext = _.clone(writeContext);
        versionContext.version = 4711;

        expect( work.command.update ).withArgs(
            versionContext, oldWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.ConflictError ); });
    });

    it('should change updated_*', function(done) {
        // Need a small delay from work creation for this to be guaranteed to work
        setTimeout(function() {
            var r = work.command.update(writeContext, oldWork, { alias: 'foo' });

            expect( r ).to.have.property( 'save' );
            var w = r.save;

            expect( w.updated_by ).to.eql( userId );
            expect( w.updated_at.getTime() ).to.not.be( w.added_at.getTime() );
            done();
        }, 20);
    });

    it('should update simple properties and generate events', function() {
        var newProps = {
            alias: 'new alias',
            description: null, // drop value
            public: true,
        };

        var r = work.command.update(writeContext, oldWork, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var w = r.save;
        var e = r.event;

        expect( w.id ).to.eql( oldWork.id );
        expect( w.alias ).to.be( 'new alias' );
        expect( w.description ).to.be( undefined );
        expect( w.public ).to.be( true );

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.object.toString() ).to.eql( oldWork.id );

        expect( e.events ).to.have.length( 3 );

        expect( e.events[0].event ).to.be( 'core.work.changed' );
        expect( e.events[0].param.property ).to.be( 'alias' );
        expect( e.events[0].param.old_value ).to.be( 'old alias' );
        expect( e.events[0].param.new_value ).to.be( 'new alias' );

        expect( e.events[1].event ).to.be( 'core.work.changed' );
        expect( e.events[1].param.property ).to.be( 'description' );
        expect( e.events[1].param.old_value ).to.be( 'old description' );
        expect( e.events[1].param.new_value ).to.be( null );

        expect( e.events[2].event ).to.be( 'core.work.changed' );
        expect( e.events[2].param.property ).to.be( 'public' );
        expect( e.events[2].param.old_value ).to.be( false );
        expect( e.events[2].param.new_value ).to.be( true );
    });
});


describe('Delete work', function() {
    var userId = new ObjectId();
    var oldWork;
    var adminContext;

    /* Create a object to be deleted as another user to allow correct
     * context handling to be tested. */
    beforeEach(function() {
        oldWork = work.command.create({ userId: new ObjectId() }, {
            alias: 'old alias',
            description: 'old description',
            public: false,
        }).save;

        adminContext = { userId: userId, perms: {} };

        adminContext.perms[oldWork.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    afterEach(function() {
        oldWork = null;
    });

    it('should require admin to delete', function() {
        var otherUserContext = {
            userId: new ObjectId(),
            perms: {}
        };

        expect( work.command.delete ).withArgs(
            otherUserContext, oldWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should reject conflicts when requesting specific version', function() {
        var versionContext = _.clone(adminContext);
        versionContext.version = 4711;

        expect( work.command.delete ).withArgs(
            versionContext, oldWork, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.ConflictError ); });
    });

    it('should remove work and generate events', function() {
        var r = work.command.delete(adminContext, oldWork);
        expect( r ).to.have.property( 'remove' );
        expect( r ).to.have.property( 'event' );
        var w = r.remove;
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.deleted' );
        expect( e.events[0].param ).to.have.property( 'work' );
        expect( e.events[0].param.work.id.toString() ).to.be( w.id );
    });
});

describe('Work collaborators', function() {
    var userId = new ObjectId();
    var collaboratorId = new ObjectId();
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

    it('updateWork should generate collabs.users.added events for new users', function() {
        var r, e;

        r = work.command.update(testContext, testWork, {
            collabs: {
                users: [collaboratorId],
            }
        });

        expect( r ).to.have.property( 'save' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.collabs.users.added' );
        expect( e.events[0].param ).to.have.property( 'user_id' );
        expect( e.events[0].param.user_id ).to.be( collaboratorId );
    });

    it('updateWork should generate collabs.users.removed events for removed users', function() {
        var r, e;

        r = work.command.update(testContext, testWork, {
            collabs: {
                users: [],
            }
        });

        expect( r ).to.have.property( 'save' );
        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.work.collabs.users.removed' );
        expect( e.events[0].param ).to.have.property( 'user_id' );
        expect( e.events[0].param.user_id ).to.be( collaboratorId );
    });

    it('updateWork should not generate events for repeated ids', function() {
        var r, w, e;

        r = work.command.update(testContext, testWork, {
            collabs: {
                users: [collaboratorId],
            }
        });

        expect( r ).to.have.property( 'save' );
        w = r.save;

        r = work.command.update(testContext, testWork, {
            collabs: {
                users: [collaboratorId],
            }
        });

        expect( r ).to.have.property( 'save' );
        w = r.save;

        e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Work' );
        expect( e.events ).to.have.length( 0 );
    });

    it('collabs.users should be able to read, write, admin', function() {
        var context = { userId: collaboratorId };
        work.setWorkPerms(context)(testWork);

        expect( context.perms[testWork.id].read ).to.be.ok();
        expect( context.perms[testWork.id].write ).to.be.ok();
        expect( context.perms[testWork.id].admin ).to.be.ok();
    });
});
