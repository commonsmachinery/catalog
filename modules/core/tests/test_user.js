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

    it('should require src._id', function() {
        expect( user.command.create ).withArgs( context, {} ).to.throwException(
            function (e) { expect( e ).to.be.a( command.CommandError ); });
    });

    it('should use src._id for new object', function() {
        var r = user.command.create(context, { _id: id });
        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

        expect( u._id ).to.be(id);
    });

    it('should generate events', function() {
        var r = user.command.create(context, { _id: id });
        expect( r ).to.have.property( 'obj' );
        expect( r ).to.have.property( 'event' );
        var u = r.obj;
        var e = r.event;

        expect( e.user ).to.eql( id );
        expect( e.type ).to.be( 'core.User' );
        expect( e.object ).to.eql( id );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].type ).to.be( 'user.created' );
        expect( e.events[0].param ).to.have.property( 'user' );
        expect( e.events[0].param.user._id.toString() ).to.eql( u.id );
    });

    it('should set added_by and update_by to new user', function() {
        var r = user.command.create(context, { _id: id });
        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

        expect( u.added_by ).to.be(id);
        expect( u.updated_by ).to.be(id);
    });

    it('should create empty profile if none is provided', function() {
        var r = user.command.create(context, { _id: id });

        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

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
            _id: id,
            alias: 'foo',
            profile: {
                name: 'Foo Barson',
                email: 'foo@example.org',
                location: 'Gazonk County',
                website: 'http://foo.example.org/',
                gravatar_email: 'foo-face@example.org',
            },
        });

        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

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
            _id: id,
            profile: {
                gravatar_email: null,
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

        expect( u ).to.have.property( 'profile' );
        expect( u.profile.gravatar_email ).to.be( undefined );
        expect( u.profile.gravatar_hash ).to.be( gravatar.emailHash(id.toString()) );
    });

    it('should set gravatar_hash based on gravatar_email when provided', function() {
        var r = user.command.create(context, {
            _id: id,
            profile: {
                gravatar_email: 'foo-face@example.org',
                gravtar_hash: 'this will be ignored',
            }
        });

        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

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
            _id: id,
            alias: 'old alias',
            profile: {
                name: 'old name',
                email: 'old@example.org',
                location: 'old location',
                // website not set
                gravatar_email: 'old-id@example.org',
            },
        }).obj;
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

        expect( r ).to.have.property( 'obj' );
        expect( r ).to.have.property( 'event' );
        var u = r.obj;
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

        expect( e.events[0].type ).to.be( 'user.alias.changed' );
        expect( e.events[0].param.old_value ).to.be( 'old alias' );
        expect( e.events[0].param.new_value ).to.be( 'new alias' );

        expect( e.events[1].type ).to.be( 'user.profile.name.changed' );
        expect( e.events[1].param.old_value ).to.be( 'old name' );
        expect( e.events[1].param.new_value ).to.be( 'new name' );

        expect( e.events[2].type ).to.be( 'user.profile.email.changed' );
        expect( e.events[2].param.old_value ).to.be( 'old@example.org' );
        expect( e.events[2].param.new_value ).to.be( 'new@example.org' );

        expect( e.events[3].type ).to.be( 'user.profile.location.changed' );
        expect( e.events[3].param.old_value ).to.be( 'old location' );
        expect( e.events[3].param.new_value ).to.be( null );

        expect( e.events[4].type ).to.be( 'user.profile.website.changed' );
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

        expect( r ).to.have.property( 'obj' );
        expect( r ).to.have.property( 'event' );
        var u = r.obj;
        var e = r.event;

        expect( u.id ).to.eql( id.toString() );
        expect( u.profile.gravatar_email ).to.be( 'new-id@example.org' );
        expect( u.profile.gravatar_hash ).to.be(
            gravatar.emailHash('new-id@example.org') );

        expect( e.user ).to.eql( id );
        expect( e.type ).to.be( 'core.User' );
        expect( e.object ).to.eql( id );

        expect( e.events ).to.have.length( 1 );

        expect( e.events[0].type ).to.be( 'user.profile.gravatar_email.changed' );
        expect( e.events[0].param.old_value ).to.be( 'old-id@example.org' );
        expect( e.events[0].param.new_value ).to.be( 'new-id@example.org' );
    });
});

