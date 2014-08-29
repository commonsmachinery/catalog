/* Catalog core - Test event mirroring

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* global describe, it */

'use strict';

var debug = require('debug')('catalog:core:test:mirror'); // jshint ignore:line

// External modules
var expect = require('expect.js');
var ObjectId = require('mongoose').Types.ObjectId;

// Core modules
var mirror = require('../lib/mirror.js');

// Helper variables
var now = Date();
var user = new ObjectId().toString();
var source = new ObjectId().toString();
var target = new ObjectId().toString();


var mirrorEvent = function(event, param) {
    var e = {
        user: user,
        date: now,
        object: source,
        event: event,
        param: param
    };

    return mirror.handlers[event](e);
};

describe('Mirroring event', function() {

    //
    // Media
    //

    describe('core.work.media.added', function() {
        it('should generate core.media.work.added', function() {
            var e = mirrorEvent('core.work.media.added', {
                media_id: target
            });

            expect( e.user.toString() ).to.be( user );
            expect( Date(e.date) ).to.be( Date(now) );
            expect( e.type ).to.be( 'core.Media' );
            expect( e.object.toString() ).to.be( target );
            expect( e.events ).to.have.length( 1 );

            expect( e.events[0].event ).to.be( 'core.media.work.added' );
            expect( e.events[0].param ).to.have.property( 'work_id' );
            expect( e.events[0].param.work_id.toString() ).to.be( source );
        });
    });

    describe('core.work.media.removed', function() {
        it('should generate core.media.work.removed', function() {
            var e = mirrorEvent('core.work.media.removed', {
                media_id: target
            });

            expect( e.user.toString() ).to.be( user );
            expect( Date(e.date) ).to.be( Date(now) );
            expect( e.type ).to.be( 'core.Media' );
            expect( e.object.toString() ).to.be( target );
            expect( e.events ).to.have.length( 1 );

            expect( e.events[0].event ).to.be( 'core.media.work.removed' );
            expect( e.events[0].param ).to.have.property( 'work_id' );
            expect( e.events[0].param.work_id.toString() ).to.be( source );
        });
    });


    describe('core.media.created', function() {
        it('should generate core.media.replaced', function() {
            var e = mirrorEvent('core.media.created', {
                media: {
                    replaces: target
                }
            });

            expect( e.user.toString() ).to.be( user );
            expect( Date(e.date) ).to.be( Date(now) );
            expect( e.type ).to.be( 'core.Media' );
            expect( e.object.toString() ).to.be( target );
            expect( e.events ).to.have.length( 1 );

            expect( e.events[0].event ).to.be( 'core.media.replaced' );
            expect( e.events[0].param ).to.have.property( 'new_media_id' );
            expect( e.events[0].param.new_media_id.toString() ).to.be( source );
        });
    });

    describe('core.work.created', function() {
        it('should generate core.org.work.created if owned by org', function() {
            var e = mirrorEvent('core.work.created', {
                work: {
                    owner: {
                        org: target
                    }
                }
            });

            expect( e.user.toString() ).to.be( user );
            expect( Date(e.date) ).to.be( Date(now) );
            expect( e.type ).to.be( 'core.Organisation' );
            expect( e.object.toString() ).to.be( target );
            expect( e.events ).to.have.length( 1 );

            expect( e.events[0].event ).to.be( 'core.org.work.created' );
            expect( e.events[0].param ).to.have.property( 'work_id' );
            expect( e.events[0].param.work_id.toString() ).to.be( source );
        });
    });

    describe('core.work.deleted', function() {
        it('should generate core.org.work.deleted if owned by org', function() {
            var e = mirrorEvent('core.work.deleted', {
                work: {
                    owner: {
                        org: target
                    }
                }
            });

            expect( e.user.toString() ).to.be( user );
            expect( Date(e.date) ).to.be( Date(now) );
            expect( e.type ).to.be( 'core.Organisation' );
            expect( e.object.toString() ).to.be( target );
            expect( e.events ).to.have.length( 1 );

            expect( e.events[0].event ).to.be( 'core.org.work.deleted' );
            expect( e.events[0].param ).to.have.property( 'work_id' );
            expect( e.events[0].param.work_id.toString() ).to.be( source );
        });
    });

});
