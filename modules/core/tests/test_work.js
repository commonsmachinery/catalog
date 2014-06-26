/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it */

'use strict';

var debug = require('debug')('catalog:core:test:work'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var Types = require('mongoose').Types;

// Catalog modules
var command = require('../../../lib/command'); // jshint ignore:line

// Core modules
var work = require('../lib/work.js');

describe('Create work', function() {
    var userId = new Types.ObjectId();
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
        expect( e.events[0].type ).to.be( 'work.created' );
        expect( e.events[0].param ).to.have.property( 'work' );
        expect( e.events[0].param.work._id ).to.eql( m._id );
    });

    it('should set added_by to given user', function() {
        var r = work.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.added_by ).to.be( userId );
    });

    it('should use provided annotations', function() {
        var r = work.command.create(context, {
            annotations: [{
                updated_by: userId,
                score: 100,
                property: {
                    propertyName: 'title',
                    titleLabel: 'test',
                    value: 'test',
                },
            }],
        });
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m ).to.have.property( 'annotations' );
        expect( m.annotations.length ).to.be( 1 );
        expect( m.annotations[0].score ).to.be( 100 );
        expect( m.annotations[0].property.propertyName ).to.be( 'title' );
        expect( m.annotations[0].property.titleLabel ).to.be( 'test' );
        expect( m.annotations[0].property.value ).to.be( 'test' );
    });

    it('forking should link to original work', function() {
        var r = work.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m1 = r.save;

        r = work.command.create(context, {}, m1);
        expect( r ).to.have.property( 'save' );
        var m2 = r.save;

        expect( m2.forked_from ).to.be( m1._id );
    });

});
