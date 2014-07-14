/*
  Catalog event - transfer and publishing

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event:transfer'); // jshint ignore:line

// External libs
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');
var zmq = require('zmq');
var _ = require('underscore');

// Common libs
var config = require('../../../lib/config');
var mongo = require('../../../lib/mongo');

// Event libs
var db = require('./db');

/*! Transfer events from a source collection into the event log.
 *
 * Emits `event` on successful transfer.
 */
var Transfer = function(sourceCollection) {
    EventEmitter.call(this);

    this.sourceCollection = sourceCollection;
    this.cursor = null;
    this.lastEvent = null;
};

util.inherits(Transfer, EventEmitter);

Transfer.prototype.start = function() {
    var self = this;

    // Find the last event, or something close enough.  Since
    // ObjectIds start with a timestamp, this get us something at the
    // very end of the event log.
    db.EventBatch.findOne({}).sort({ _id: -1 }).exec()
        .then(
            function(ev) {
                if (ev) {
                    debug('last logged event: %s %s', ev.id, ev.date);
                    self.lastEvent = ev;
                }

                if (!self.cursor) {
                    self._openCursor();
                }
            },

            function(err) {
                debug('error finding last logged event: %s', err);
            }
        );
};

Transfer.prototype._openCursor = function() {
    // TODO: this will need to be more stable by looking further back
    // in time, but for initial coding we can take it easy

    var query;

    if (this.lastEvent) {
        debug('opening cursor tailing after %s', this.lastEvent.date);
        query = { date: { $gt: this.lastEvent.date }};
    }
    else {
        debug('opening cursor tailing entire collection');
        query = {};
    }

    this.cursor = this.sourceCollection.find(query, {
        tailable: true,
        awaitdata: true,
        numberOfRetries: 0, // Hack: disable tailable cursor timeouts
        hint: { $natural: 1 },

        // TODO: set readPreference
    });

    this._nextEvent();
};

Transfer.prototype._nextEvent = function() {
    var self = this;

    this.cursor.nextObject(function(err, item) {
        if (err) {
            self._handleCursorError(err);
        }
        else {
            self._handleEvent(item);
        }
    });
};

Transfer.prototype._handleCursorError = function(err) {
    var self = this;

    debug('transfer cursor error: %s', err);

    this.cursor.close(function() {
        debug('transfer cursor closed');
        self.cursor = null;

        // Retry after a delay
        setTimeout(function() { self._openCursor(); }, 5000);
    });
};


Transfer.prototype._handleEvent = function(sourceEvent) {
    var self = this;

    if (!sourceEvent) {
        this._handleCursorError('empty collection');
        return;
    }

    // Create an event log version and store it.
    db.EventBatch.create(sourceEvent)
        .then(
            function onResolve(logEvent) {
                self.lastEvent = logEvent;
                self.emit('event', logEvent);
                self._nextEvent();
            },

            // These are not Bluebird Promises, so there's no catch (...)

            function onReject(err) {
                if (err.code === 11000 || err.code === 11001) {
                    debug('skipping already logged event: %s', sourceEvent._id);
                    self._nextEvent();
                }
                else {
                    debug('error logging event: %s', err);
                    self._handleCursorError(err);
                }
            }
        );
};


var Publisher = function() {
    this._socket = null;
};

/*! Open socket, returning a promise that resolves when done.
 */
Publisher.prototype.open = function() {
    this._socket = zmq.socket('pub');

    console.log('publishing events at %s', config.event.pubAddress);

    var bindAsync = Promise.promisify(this._socket.bind, this._socket);
    return bindAsync(config.event.pubAddress);
};

/*! Publish an event batch */
Publisher.prototype.publish = function(batch) {
    var scope = JSON.stringify(_.pick(
        batch, 'user', 'date', 'type', 'object', 'version'));

    var i;
    for (i = 0; i < batch.events.length; i++) {
        var ev = batch.events[i];
        var msg = [ev.event, scope, JSON.stringify(ev.param)];

        debug('publishing: %s', msg);
        this._socket.send(msg);
    }
};

exports.start = function() {
    var pub = new Publisher();

    // We need connections to all the staging databases, as well as
    // our normal database connection.

    Promise.props({
        core: mongo.createConnection(config.core.db),
        event: db.connect(),
        pub: pub.open(),
    })
    .then(function(conns) {
        console.log('event transfer starting');

        var coreTransfer = new Transfer(conns.core.collection('coreevents'));
        coreTransfer.start();

        coreTransfer.on('event', function(batch) {
            pub.publish(batch);
        });
    })
    .catch(function(err) {
        console.error('error starting event transfer: %s', err);
    });
};
