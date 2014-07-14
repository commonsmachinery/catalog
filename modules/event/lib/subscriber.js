/*
  Catalog event - event subscriber class

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event:subscribe'); // jshint ignore:line

// External libs
var EventEmitter = require('events').EventEmitter;
var zmq = require('zmq');

// Common libs
var config = require('../../../lib/config');


/** Event subscriber interface for backend tasks.
 *
 * TODO: this is just a simple lossy subscriber for now, with no error
 * handling or capability to enforce sequential event processing.  It
 * is sufficient for initial development, but must be much extended to
 * work in production.
 */
var Subscriber = exports.Subscriber = function(options) {
    var self = this;

    // ZMQ SUB socket
    this._socket = zmq.socket('sub');
    this._socket.connect(config.event.pubAddress);

    this._socket.on('message', function() { self._handleMessage.apply(self, arguments); });

    // Underlying emitter: this will need to be more advanced later to
    // allow for sequential processing.
    this._emitter = new EventEmitter();
};


/** Register an event handler.
 *
 * The handler will be called with a single map that contains the
 * following properties:
 *
 * - `event`: name of the event
 * - `user`: `User.id` or `SiteAdmin.id` triggering the event, omitted
 *   for system-generated events.
 * - `date`: Event `Date`.
 * - `type`: Affected object type, e.g. `core.Work`.
 * - `object`: Affected object `ObjectId`.
 * - `version`: Object version generating the events, if known
 * - `param`: Event parameters.
 *
 * **Note**: All the parameters are basic javascript types, since this
 * has been passed through JSON.  If e.g. a `Date` is needed, it must
 * be created explicitly by the handler from the string in the data.
 *
 * Parameters:
 *   - event: event name
 *   - handler: function(data)
 */
Subscriber.prototype.on = function(event, handler) {
    if (EventEmitter.listenerCount(this._emitter, event) === 0) {
        debug('subscribing: %s', event);
        this._socket.subscribe(event);
    }

    this._emitter.on(event, handler);
};


Subscriber.prototype._handleMessage = function() {
    var msg = arguments;

    if (msg.length < 3) {
        console.error('invalid message: %j', msg);
        return;
    }

    var event = msg[0].toString();
    var data, param;

    try {
        data = JSON.parse(msg[1].toString());
        param = JSON.parse(msg[2].toString());
    }
    catch (err) {
        console.error('invalid message: %s: %j', err, msg);
        return;
    }

    // Include event name in data to help handlers
    data.event = event;
    data.param = param;

    this._emitter.emit(event, data);
};
