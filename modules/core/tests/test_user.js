/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it, beforeEach, afterEach */

'use strict';

var debug = require('debug')('catalog:core:test:user'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var Types = require('mongoose').Types;
var _ = require('underscore');

// Catalog modules
var gravatar = require('../../../lib/gravatar');
var command = require('../../../lib/command');

// Core modules
var user = require('../lib/user.js');

describe('User permissions', function() {
    var id = new Types.ObjectId();
    var u = { id: id.toString() };

    it('should let user write', function() {
        var context = { userId: id };

        user.setUserPerms(context)(u);

        var perms = context.perms[id.toString()];
        expect( perms.write ).to.be.ok();
    });

    it('should not let another user write', function() {
        var context = { userId: new Types.ObjectId() };

        user.setUserPerms(context)(u);

        var perms = context.perms[id.toString()];
        expect( perms.write ).to.not.be.ok();
    });

    it('should not let anonymous users write', function() {
        var context = { };

        user.setUserPerms(context)(u);

        var perms = context.perms[id.toString()];
        expect( perms.write ).to.not.be.ok();
    });
});


describe('Create user', function() {
    var id = new Types.ObjectId();
    var context = { userId: id };

    it('should require src.id', function() {
        expect( user.command.create ).withArgs( context, {} ).to.throwException(
            function (e) { expect( e ).to.be.a( command.CommandError ); });
    });

    it('should use src.id for new object', function() {
        var r = user.command.create(context, { id: id });
        expect( r ).to.have.property( 'save' );
        var u = r.save;

        expect( u._id ).to.be(id);
    });

    it('should generate events', function() {
        var r = user.command.create(context, { id: id });
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var u = r.save;
        var e = r.event;

        expect( e.user ).to.eql( id );
        expect( e.type ).to.be( 'core.User' );
        expect( e.object ).to.eql( id );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].event ).to.be( 'core.user.created' );
        expect( e.events[0].param ).to.have.property( 'user' );
        expect( e.events[0].param.user.id.toString() ).to.eql( u.id );
    });

    it('should set added_by and update_by to new user', function() {
        var r = user.command.create(context, { id: id });
        expect( r ).to.have.property( 'save' );
        var u = r.save;

        expect( u.added_by ).to.be(id);
        expect( u.updated_by ).to.be(id);
    });

    it('should create empty profile if none is provided', function() {
        var r = user.command.create(context, { id: id });

        expect( r ).to.have.property( 'save' );
        var u = r.save;

        expect( u.alias ).to.be( undefined );
        expect( u ).to.have.property( 'profile' );
        expect( u.profile.name ).to.be( undefined );
        expect( u.profile.email ).to.be( undefined );
        expect( u.profile.location ).to.be( undefined );
        expect( u.profile.website ).to.be( undefined );
        expect( u.profile.gravatar_email ).to.be( undefined );
    });

    it('should use provided alias and profile', function() {
        var r = user.command.create(context, {
            id: id,
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
        var u = r.save;

        expect( u.alias ).to.be( 'foo' );
        expect( u ).to.have.property( 'profile' );
        expect( u.profile.name ).to.be( 'Foo Barson' );
        expect( u.profile.email ).to.be( 'foo@example.org' );
        expect( u.profile.location ).to.be( 'Gazonk County' );
        expect( u.profile.website ).to.be( 'http://foo.example.org/' );
        expect( u.profile.gravatar_email ).to.be( 'foo-face@example.org' );
    });

    it('should set gravatar_hash based on object ID when gravatar_email is null', function() {
        var r = user.command.create(context, {
            id: id,
            profile: {
                gravatar_email: null,
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'save' );
        var u = r.save;

        expect( u ).to.have.property( 'profile' );
        expect( u.profile.gravatar_email ).to.be( undefined );
        expect( u.profile.gravatar_hash ).to.be( gravatar.emailHash(id.toString()) );
    });

    it('should set gravatar_hash based on gravatar_email when provided', function() {
        var r = user.command.create(context, {
            id: id,
            profile: {
                gravatar_email: 'foo-face@example.org',
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'save' );
        var u = r.save;

        expect( u ).to.have.property( 'profile' );
        expect( u.profile.gravatar_email ).to.be( 'foo-face@example.org' );
        expect( u.profile.gravatar_hash ).to.be( gravatar.emailHash('foo-face@example.org') );
    });

});


describe('Update user', function() {
    var id = new Types.ObjectId();
    var context = { userId: id, perms: {} };
    var oldUser;

    // User has right to update
    context.perms[id] = { write: true };

    /* Create a object to be updated */
    beforeEach(function() {
        oldUser = user.command.create(context, {
            id: id,
            alias: 'old alias',
            profile: {
                name: 'old name',
                email: 'old@example.org',
                location: 'old location',
                // website not set
                gravatar_email: 'old-id@example.org',
            },
        }).save;
    });

    afterEach(function() {
        oldUser = null;
    });

    it('should only allow the user with write to update', function() {
        var otherUserContext = {
            userId: new Types.ObjectId(),
            perms: {}
        };

        expect( user.command.update ).withArgs(
            otherUserContext, oldUser, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.PermissionError ); });
    });

    it('should reject conflicts when requesting specific version', function() {
        var versionContext = _.clone(context);
        versionContext.version = 4711;

        expect( user.command.update ).withArgs(
            versionContext, oldUser, {}
        ).to.throwException(
            function (e) { expect( e ).to.be.a( command.ConflictError ); });
    });

    it('should change updated_date', function(done) {
        // Need a small delay from work creation for this to be guaranteed to work
        setTimeout(function() {
            var r = user.command.update(context, oldUser, { alias: 'foo' });

            expect( r ).to.have.property( 'save' );
            var u = r.save;

            expect( u.updated_at.getTime() ).to.not.be( u.added_at.getTime() );
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

        var r = user.command.update(context, oldUser, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var u = r.save;
        var e = r.event;

        expect( u.id ).to.eql( id.toString() );
        expect( u.alias ).to.be( 'new alias' );
        expect( u.profile.name ).to.be( 'new name' );
        expect( u.profile.email ).to.be( 'new@example.org' );
        expect( u.profile.location ).to.be( undefined );
        expect( u.profile.website ).to.be( 'http://example.org/new' );
        expect( u.profile.gravatar_email ).to.be( 'old-id@example.org' );
        expect( u.profile.gravatar_hash ).to.be(
            gravatar.emailHash('old-id@example.org') );

        expect( e.user ).to.eql( id );
        expect( e.type ).to.be( 'core.User' );
        expect( e.object ).to.eql( id );

        expect( e.events ).to.have.length( 5 );

        expect( e.events[0].event ).to.be( 'core.user.changed' );
        expect( e.events[0].param.property ).to.be( 'alias' );
        expect( e.events[0].param.old_value ).to.be( 'old alias' );
        expect( e.events[0].param.new_value ).to.be( 'new alias' );

        expect( e.events[1].event ).to.be( 'core.user.changed.profile' );
        expect( e.events[1].param.property ).to.be( 'name' );
        expect( e.events[1].param.old_value ).to.be( 'old name' );
        expect( e.events[1].param.new_value ).to.be( 'new name' );

        expect( e.events[2].event ).to.be( 'core.user.changed.profile' );
        expect( e.events[2].param.property ).to.be( 'email' );
        expect( e.events[2].param.old_value ).to.be( 'old@example.org' );
        expect( e.events[2].param.new_value ).to.be( 'new@example.org' );

        expect( e.events[3].event ).to.be( 'core.user.changed.profile' );
        expect( e.events[3].param.property ).to.be( 'location' );
        expect( e.events[3].param.old_value ).to.be( 'old location' );
        expect( e.events[3].param.new_value ).to.be( null );

        expect( e.events[4].event ).to.be( 'core.user.changed.profile' );
        expect( e.events[4].param.property ).to.be( 'website' );
        expect( e.events[4].param.old_value ).to.be( null );
        expect( e.events[4].param.new_value ).to.be( 'http://example.org/new' );
    });


    it('should generate new gravatar hash when gravatar email changes', function() {
        var newProps = {
            profile: {
                gravatar_email: 'new-id@example.org'
            },
        };

        var r = user.command.update(context, oldUser, newProps);

        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var u = r.save;
        var e = r.event;

        expect( u.id ).to.eql( id.toString() );
        expect( u.profile.gravatar_email ).to.be( 'new-id@example.org' );
        expect( u.profile.gravatar_hash ).to.be(
            gravatar.emailHash('new-id@example.org') );

        expect( e.user ).to.eql( id );
        expect( e.type ).to.be( 'core.User' );
        expect( e.object ).to.eql( id );

        expect( e.events ).to.have.length( 1 );

        expect( e.events[0].event ).to.be( 'core.user.changed.profile' );
        expect( e.events[0].param.property ).to.be( 'gravatar_email' );
        expect( e.events[0].param.old_value ).to.be( 'old-id@example.org' );
        expect( e.events[0].param.new_value ).to.be( 'new-id@example.org' );
    });
});


describe('Export user object', function() {
    var id = new Types.ObjectId();
    var context = { userId: id, perms: {} };
    var userDoc;

    // User has right to update
    context.perms[id] = { write: true };

    /* Create a object to be updated */
    beforeEach(function() {
        userDoc = user.command.create(context, {
            id: id,
            alias: 'alias',
            profile: {
                name: 'name',
                email: 'email@example.org',
                location: 'location',
                website: 'http://example.org/',
                gravatar_email: 'id@example.org',
            },
        }).save;
    });

    afterEach(function() {
        userDoc = null;
    });

    it('should include gravatar_email and write perms for user', function() {
        var u = userDoc.exportObject(context);

        expect( u.alias ).to.be( 'alias' );
        expect( u.profile.name ).to.be( 'name' );
        expect( u.profile.email ).to.be( 'email@example.org' );
        expect( u.profile.location ).to.be( 'location' );
        expect( u.profile.website ).to.be( 'http://example.org/' );
        expect( u.profile.gravatar_email ).to.be( 'id@example.org' );
        expect( u.profile.gravatar_hash ).to.be(
            gravatar.emailHash('id@example.org') );

        expect( u._perms.write ).to.be.ok();
    });

    it('should not include gravatar_email or any perms for anonymous users', function() {
        var u = userDoc.exportObject({});
        expect( u.profile.gravatar_email ).to.be( undefined );
        expect( u._perms ).to.be.empty();
    });

    it('should not include gravatar_email or any perms for other users', function() {
        var u = userDoc.exportObject({ userId: new Types.ObjectId() });
        expect( u.profile.gravatar_email ).to.be( undefined );
        expect( u._perms ).to.be.empty();
    });
});
