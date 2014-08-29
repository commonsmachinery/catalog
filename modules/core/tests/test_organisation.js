/* Catalog core - Test organisation objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:core:test:organisation'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var Types = require('mongoose').Types;
var _ = require('underscore');

// Catalog modules
var gravatar = require('../../../lib/gravatar');
var command = require('../../../lib/command');

// Core modules
var organisation = require('../lib/organisation.js');

describe('Create organisation', function() {
    var userId = new Types.ObjectId();
    var context = { userId: userId };

    it('should generate events', function() {
        var r = organisation.command.create(context, { });
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var o = r.save;
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Organisation' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.org.created' );
        expect( e.events[0].param ).to.have.property( 'organisation' );
        expect( e.events[0].param.organisation.id.toString() ).to.eql( o.id );
    });

    it('should set added_by and update_by to new user', function() {
        var r = organisation.command.create(context, { });
        expect( r ).to.have.property( 'save' );
        var o = r.save;

        expect( o.added_by ).to.be(userId);
        expect( o.updated_by ).to.be(userId);
    });

    it('should create empty profile if none is provided', function() {
        var r = organisation.command.create(context, { });

        expect( r ).to.have.property( 'save' );
        var o = r.save;

        expect( o.alias ).to.be( undefined );
        expect( o ).to.have.property( 'profile' );
        expect( o.profile.name ).to.be( undefined );
        expect( o.profile.email ).to.be( undefined );
        expect( o.profile.location ).to.be( undefined );
        expect( o.profile.website ).to.be( undefined );
        expect( o.profile.gravatar_email ).to.be( undefined );
    });

    it('should use provided alias and profile', function() {
        var r = organisation.command.create(context, {
            alias: 'foo',
            profile: {
                name: 'Foo Barson',
                email: 'foo@example.org',
                location: 'Gazonk County',
                website: 'http://foo.example.org/',
                gravatar_email: 'foo-face@example.org',
            },
        });

        expect( r ).to.have.property( 'save' );
        var o = r.save;

        expect( o.alias ).to.be( 'foo' );
        expect( o ).to.have.property( 'profile' );
        expect( o.profile.name ).to.be( 'Foo Barson' );
        expect( o.profile.email ).to.be( 'foo@example.org' );
        expect( o.profile.location ).to.be( 'Gazonk County' );
        expect( o.profile.website ).to.be( 'http://foo.example.org/' );
        expect( o.profile.gravatar_email ).to.be( 'foo-face@example.org' );
    });

    it('should set gravatar_hash when gravatar_email is null', function() {
        var r = organisation.command.create(context, {
            profile: {
                gravatar_email: null,
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'save' );
        var o = r.save;

        expect( o ).to.have.property( 'profile' );
        expect( o.profile.gravatar_email ).to.be( undefined );
        expect( o.profile.gravatar_hash ).to.be.ok( );
    });

    it('should set gravatar_hash based on gravatar_email when provided', function() {
        var r = organisation.command.create(context, {
            profile: {
                gravatar_email: 'foo-face@example.org',
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'save' );
        var o = r.save;

        expect( o ).to.have.property( 'profile' );
        expect( o.profile.gravatar_email ).to.be( 'foo-face@example.org' );
        expect( o.profile.gravatar_hash ).to.be( gravatar.emailHash('foo-face@example.org') );
    });

});


describe('Update organisation', function() {
    var userId = new Types.ObjectId();
    var context;
    var oldOrg;

    /* Create a object to be updated */
    beforeEach(function() {
        oldOrg = organisation.command.create({ userId: userId }, {
            alias: 'old alias',
            profile: {
                name: 'old name',
                email: 'old@example.org',
                location: 'old location',
                // website not set
                gravatar_email: 'old-id@example.org',
            },
        }).save;

        context = { userId: userId, perms: {} };

        context.perms[oldOrg.id] = {
            read: true,
            write: true,
            admin: true
        };
    });

    afterEach(function() {
        oldOrg = null;
    });

    it('should only allow the user with write to update', function() {
        var otherUserContext = {
            userId: new Types.ObjectId(),
            perms: {}
        };

        expect( organisation.command.update ).withArgs(
            otherUserContext, oldOrg, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should reject conflicts when requesting specific version', function() {
        var versionContext = _.clone(context);
        versionContext.version = 4711;

        expect( organisation.command.update ).withArgs(
            versionContext, oldOrg, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.ConflictError ); });
    });

    it('should change updated_date', function(done) {
        // Need a small delay from work creation for this to be guaranteed to work
        setTimeout(function() {
            var r = organisation.command.update(context, oldOrg, { alias: 'foo' });

            expect( r ).to.have.property( 'save' );
            var o = r.save;

            expect( o.updated_at.getTime() ).to.not.be( o.added_at.getTime() );
            done();
        }, 20);
    });

    it('should update object and generate events', function() {
        var newProps = {
            alias: 'new alias',
            profile: {
                name: 'new name',
                email: 'new@example.org',
                location: null,             // drop value
                website: 'http://example.org/new',
                // no change to gravatar_email
                gravatar_hash: 'should not be changed',
            },
        };

        var r = organisation.command.update(context, oldOrg, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var o = r.save;
        var e = r.event;

        expect( o.alias ).to.be( 'new alias' );
        expect( o.profile.name ).to.be( 'new name' );
        expect( o.profile.email ).to.be( 'new@example.org' );
        expect( o.profile.location ).to.be( undefined );
        expect( o.profile.website ).to.be( 'http://example.org/new' );
        expect( o.profile.gravatar_email ).to.be( 'old-id@example.org' );
        expect( o.profile.gravatar_hash ).to.be(
            gravatar.emailHash('old-id@example.org') );

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Organisation' );

        expect( e.events ).to.have.length( 5 );

        expect( e.events[0].event ).to.be( 'core.org.changed' );
        expect( e.events[0].param.property ).to.be( 'alias' );
        expect( e.events[0].param.old_value ).to.be( 'old alias' );
        expect( e.events[0].param.new_value ).to.be( 'new alias' );

        expect( e.events[1].event ).to.be( 'core.org.changed.profile' );
        expect( e.events[1].param.property ).to.be( 'name' );
        expect( e.events[1].param.old_value ).to.be( 'old name' );
        expect( e.events[1].param.new_value ).to.be( 'new name' );

        expect( e.events[2].event ).to.be( 'core.org.changed.profile' );
        expect( e.events[2].param.property ).to.be( 'email' );
        expect( e.events[2].param.old_value ).to.be( 'old@example.org' );
        expect( e.events[2].param.new_value ).to.be( 'new@example.org' );

        expect( e.events[3].event ).to.be( 'core.org.changed.profile' );
        expect( e.events[3].param.property ).to.be( 'location' );
        expect( e.events[3].param.old_value ).to.be( 'old location' );
        expect( e.events[3].param.new_value ).to.be( null );

        expect( e.events[4].event ).to.be( 'core.org.changed.profile' );
        expect( e.events[4].param.property ).to.be( 'website' );
        expect( e.events[4].param.old_value ).to.be( null );
        expect( e.events[4].param.new_value ).to.be( 'http://example.org/new' );
    });

    it('should generate core.org.owner.added event', function() {
        var newOwner = new Types.ObjectId();
        var newProps = {
            owners: [ userId, newOwner ]
        };

        var r = organisation.command.update(context, oldOrg, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var e = r.event;

        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.org.owner.added' );
        expect( e.events[0].param.user_id ).to.be( newOwner );
    });

    it('should generate core.org.owner.removed event', function() {
        var newProps = {
            owners: [ ]
        };

        var r = organisation.command.update(context, oldOrg, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var e = r.event;

        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.org.owner.removed' );
        expect( e.events[0].param.user_id ).to.be( userId );
    });

    it('should generate new gravatar hash when gravatar email changes', function() {
        var newProps = {
            profile: {
                gravatar_email: 'new-id@example.org'
            },
        };

        var r = organisation.command.update(context, oldOrg, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var o = r.save;
        var e = r.event;

        expect( o.profile.gravatar_email ).to.be( 'new-id@example.org' );
        expect( o.profile.gravatar_hash ).to.be(
            gravatar.emailHash('new-id@example.org') );

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Organisation' );

        expect( e.events ).to.have.length( 1 );

        expect( e.events[0].event ).to.be( 'core.org.changed.profile' );
        expect( e.events[0].param.property ).to.be( 'gravatar_email' );
        expect( e.events[0].param.old_value ).to.be( 'old-id@example.org' );
        expect( e.events[0].param.new_value ).to.be( 'new-id@example.org' );
    });
});


describe('Export organisation', function() {
    var userId = new Types.ObjectId();
    var context = { userId: userId, perms: {} };
    var orgDoc;

    /* Create a object to be updated */
    beforeEach(function() {
        orgDoc = organisation.command.create(context, {
            alias: 'alias',
            profile: {
                name: 'name',
                email: 'email@example.org',
                location: 'location',
                website: 'http://example.org/',
                gravatar_email: 'id@example.org',
            },
        }).save;

        // User has right to update
        context.perms[orgDoc.id] = { write: true };
    });

    afterEach(function() {
        orgDoc = null;
    });

    it('should include gravatar_email and write perms for owner', function() {
        var o = orgDoc.exportObject(context);

        expect( o.alias ).to.be( 'alias' );
        expect( o.profile.name ).to.be( 'name' );
        expect( o.profile.email ).to.be( 'email@example.org' );
        expect( o.profile.location ).to.be( 'location' );
        expect( o.profile.website ).to.be( 'http://example.org/' );
        expect( o.profile.gravatar_email ).to.be( 'id@example.org' );
        expect( o.profile.gravatar_hash ).to.be(
            gravatar.emailHash('id@example.org') );

        expect( o._perms.write ).to.be.ok();
    });

    it('should not include gravatar_email or any perms for anonymous users', function() {
        var o = orgDoc.exportObject({});
        expect( o.profile.gravatar_email ).to.be( undefined );
        expect( o._perms ).to.be.empty();
    });

    it('should not include gravatar_email or any perms for other users', function() {
        var o = orgDoc.exportObject({ userId: new Types.ObjectId() });
        expect( o.profile.gravatar_email ).to.be( undefined );
        expect( o._perms ).to.be.empty();
    });
});
