/* Catalog core - generate mirror events

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:mirror'); // jshint ignore:line

// Common libs
var command = require('../../../lib/command');

// Modules
var event = require('../../../modules/event/event');

// Core libs
var db = require('./db');


// Event handlers which all should return a new event batch.
// Exported to support unit tests.
var handlers = exports.handlers = {

    //
    // Media
    //

    'core.work.media.added': function(event) {
        return new db.CoreEvent({
            user: event.user,
            date: event.date,
            type: 'core.Media',
            object: event.param.media_id,
            events: [{
                event: 'core.media.work.added',
                param: { work_id: event.object }
            }]
        });
    },

    'core.work.media.removed': function(event) {
        return new db.CoreEvent({
            user: event.user,
            date: event.date,
            type: 'core.Media',
            object: event.param.media_id,
            events: [{
                event: 'core.media.work.removed',
                param: { work_id: event.object }
            }]
        });
    },

    'core.media.created': function(event) {
        var replaces = event.param.media.replaces;
        if (replaces) {
            return new db.CoreEvent({
                user: event.user,
                date: event.date,
                type: 'core.Media',
                object: replaces,
                events: [{
                    event: 'core.media.replaced',
                    param: { new_media_id: event.object }
                }]
            });
        }
    },

};


var mirrorEvent = function(handler) {
    return function(event) {
        var result = handler(event);
        if (result) {
            command.logEvent(result);
        }
    };
};

exports.start = function() {
    var subscriber = new event.Subscriber();

    // Wire up all event handlers
    for (var e in handlers) {
        if (handlers.hasOwnProperty(e)) {
            subscriber.on(e, mirrorEvent(handlers[e]));
        }
    }
};



