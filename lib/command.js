/* Catalog lib - Command processing (not-quite event sourcing)

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:command'); // jshint ignore:line

// External modules
var util = require('util');
var Promise = require('bluebird');

// Common modules


var CommandError = exports.CommandError = function CommandError(message) {
    this.message = message;
    this.name = "CommandError";
    Error.captureStackTrace(this, CommandError);
};

CommandError.prototype = Object.create(Error.prototype);
CommandError.prototype.constructor = CommandError;


var ConflictError = exports.ConflictError = function ConflictError(message) {
    this.message = message;
    this.name = "ConflictError";
    Error.captureStackTrace(this, ConflictError);
};

ConflictError.prototype = Object.create(Error.prototype);
ConflictError.prototype.constructor = ConflictError;


/* Execute a command, applying any additional arguments to it.
 *
 * Saves the resulting object and any generated events.
 *
 * Return a promise that resolves to the updated object, or an error.
 */
exports.execute = function execute(cmd) {
    var args = Array.prototype.slice.apply(arguments, [1]);
    var name = cmd.name;

    return new Promise(function(resolve, reject) {
        debug('executing command: %s %j', name, args);
        var r = cmd.apply(null, args);

        // Save object
        r.obj.save(function(err, obj, numberAffected) {
            if (err) {
                debug('saving result of %s failed: %j', name, err);
                reject(err);
                return;
            }

            if (numberAffected !== 1) {
                debug('conflict, object already updated: %j', r.obj);
                throw new ConflictError(util.format('%s conflict for object %s', name, r.obj.id));
            }

            // Link the events to the new version of the object
            r.event.version = obj.__v;

            // TODO: save events
            debug('should save this event batch too: %j', r.event);

            resolve(obj);
        });
    });
};
