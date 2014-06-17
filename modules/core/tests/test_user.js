/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it */

'use strict';

var debug = require('debug')('catalog:core:test:user'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var Types = require('mongoose').Types;

// Catalog modules
var gravatar = require('../../../lib/gravatar');
var CommandError = require('../../../lib/command').CommandError;

// Core modules
var user = require('../lib/user.js');

describe('Create user', function() {
    var id = new Types.ObjectId();

    it('should require src._id', function() {
        expect( user.command.create ).withArgs( {} ).to.throwException(
            function (e) { expect( e ).to.be.a( CommandError ); });
    });

    it('should use src._id for new object', function() {
        var r = user.command.create({ _id: id });
        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

        expect( u._id ).to.be(id);
    });

    it('should generate events', function() {
        var r = user.command.create({ _id: id });
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
        var r = user.command.create({ _id: id });
        expect( r ).to.have.property( 'obj' );
        var u = r.obj;

        expect( u.added_by ).to.be(id);
        expect( u.updated_by ).to.be(id);
    });

    it('should create empty profile if none is provided', function() {
        var r = user.command.create({ _id: id });

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
        var r = user.command.create({
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
        var r = user.command.create({
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
        var r = user.command.create({
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
