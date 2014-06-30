/* Catalog core - Test user objects

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it */

'use strict';

var debug = require('debug')('catalog:core:test:media'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var Types = require('mongoose').Types;

// Catalog modules
var command = require('../../../lib/command'); // jshint ignore:line

// Core modules
var media = require('../lib/media.js');

describe('Create media', function() {
    var userId = new Types.ObjectId();
    var context = { userId: userId };

    it('should generate events', function() {
        var r = media.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        expect( r ).to.have.property( 'event' );
        var m = r.save;
        var e = r.event;

        expect( e.user ).to.eql( userId );
        expect( e.type ).to.be( 'core.Media' );
        expect( e.events ).to.have.length( 1 );
        expect( e.events[0].type ).to.be( 'media.created' );
        expect( e.events[0].param ).to.have.property( 'media' );
        expect( e.events[0].param.media._id ).to.eql( m._id );
    });

    it('should set added_by to given user', function() {
        var r = media.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        expect( m.added_by ).to.be( userId );
    });

    it('should use provided annotations', function() {
        var r = media.command.create(context, {
            annotations: [{
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
        expect( m.annotations[0].property.propertyName ).to.be( 'title' );
        expect( m.annotations[0].property.titleLabel ).to.be( 'test' );
        expect( m.annotations[0].property.value ).to.be( 'test' );
    });

    it('should require property.propertyName and property.value', function() {
        var r = media.command.create(context, {
            annotations: [{
                property: { titleLabel: 'test', value: 'test' },
            }],
        });
        expect( r ).to.have.property( 'save' );
        var m = r.save;

        m.validate(function(err) {
            if (!err) {
                expect().fail("Annotation shouldn't have passed validation");
            }
        });

        r = media.command.create(context, {
            annotations: [{
                property: { titleLabel: 'test', propertyName: 'title' },
            }],
        });
        expect( r ).to.have.property( 'save' );
        m = r.save;

        m.validate(function(err) {
            if (!err) {
                expect().fail("Annotation shouldn't have passed validation");
            }
        });
    });

    it('replacing should link to old media', function() {
        var r = media.command.create(context, {});
        expect( r ).to.have.property( 'save' );
        var m1 = r.save;

        r = media.command.create(context, {}, m1);
        expect( r ).to.have.property( 'save' );
        var m2 = r.save;

        expect( m2.replaces ).to.be( m1._id );
    });

});
