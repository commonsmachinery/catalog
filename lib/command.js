/* Catalog lib - Command processing (not-quite event sourcing)

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* Were applicable, data is processed by taking cues from event
 * sourcing: a command is applied to an object (aggregate state),
 * resulting in an updated object and a set of events.  However, we do
 * store both the object and the events, rather than just the events
 * as in true event sourcing.  This is a tradeoff, sacrificing the
 * most strong consistency guarantees of event sourcing to get more
 * straight-forward code.
 *
 * One benefit is that the business logic can be written and tested as
 * such isolated commands.
 *
 * This module provides the execute function that applies commands and
 * persists the results, as well as various helper functions for
 * the command implementations.
 */

'use strict';

var debug = require('debug')('catalog:command'); // jshint ignore:line

// External modules
var util = require('util');
var Promise = require('bluebird');


/* CommandError: general errors raised during command processing,
 * e.g. incorrect parameters provided.
 */
var CommandError = exports.CommandError = function CommandError(message) {
    this.message = message;
    this.name = "CommandError";
    Error.captureStackTrace(this, CommandError);
};

util.inherits(CommandError, Error);


/* ConflictError: thrown if the command cannot be applied due to conflicts
 * from another, concurrent, update.
 */
var ConflictError = exports.ConflictError = function ConflictError(message) {
    this.message = message;
    this.name = "ConflictError";
    Error.captureStackTrace(this, ConflictError);
};

util.inherits(ConflictError, Error);


/* PermissionError: thrown if the context (user, access tokens etc)
 * doesn't permit the command to be applied.
 */
var PermissionError = exports.PermissionError = function PermissionError(userId, objectId) {
    this.message = util.format('user %s lacking permissions on %s', userId, objectId);
    this.name = "PermissionError";
    Error.captureStackTrace(this, PermissionError);
};

util.inherits(PermissionError, Error);


/* DuplicateKeyError: thrown if the object cannot be created or
 * updated due to uniqueness constraints.
 */
var DuplicateKeyError = exports.DuplicateKeyError = function DuplicateKeyError(msg) {
    this.name = "DuplicateKeyError";
    this.message = msg;

    // Try to figure out which property it is
    var m = /^.*: [^.]+\.([^.]+)\.\$([^.]+)_/.exec(msg);
    this.collection = m && m[1];
    this.property = m && m[2];

    Error.captureStackTrace(this, DuplicateKeyError);
};

util.inherits(DuplicateKeyError, Error);


/* Command utility function: Copy a property, but only if it is set
 * and truthy.
 */
exports.copyIfSet = function copyIfSet(src, dest, prop) {
    if (src && src[prop]) {
        dest[prop] = src[prop];
    }
};


/* Command utility function: update a property if changed, adding an
 * event.  Return true if property was updated.
 */

var updateProperty = exports.updateProperty =
function updateProperty(src, dest, prop, event, nameFormat) {
    var newValue = src[prop];
    var oldValue = dest[prop];

    if (newValue === undefined || newValue === oldValue) {
        // Unchanged
        return false;
    }

    // Drop or set
    dest[prop] = newValue === null ? undefined : newValue;

    event.events.push({
        type: util.format(nameFormat, prop),
        param: { old_value: oldValue === undefined ? null : oldValue,
                 new_value: newValue }
    });

    return true;
};

/* Command utility function: update several properties if changed,
 * adding events. Return true if any property was updated.
 */
exports.updateProperties = function updateProperties(src, dest, props, event, nameFormat) {
    var i, changed = false;

    for (i = 0; i < props.length; i++) {
        if (updateProperty(src, dest, props[i], event, nameFormat)) {
            changed = true;
        }
    }

    return changed;
};

/* command utility function: check that any version in the context
 * matches the current object.  Throws ConflictError if mismatch.
 */
exports.checkVersionConflict = function checkVersionConflict(context, object) {
    if (context.version !== undefined && context.version !== object.__v) {
        throw new ConflictError(util.format(
            'object %s version conflict: context %s, current %s',
            object.id, context.version, object.__v));
    }
};



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
        if (r.save) {
            r.save.save(function(err, obj, numberAffected) {
                if (err) {
                    if (err.name === 'MongoError') {
                        if (err.code === 11001 || err.code === 11000) {
                            var dupErr = new DuplicateKeyError(err.err);
                            debug('%s duplicate key for %j: %j', name, r.obj, dupErr);
                            reject(dupErr);
                            return;
                        }
                    }

                    debug('saving result of %s failed: %j', name, err);
                    reject(err);
                    return;
                }

                if (numberAffected !== 1) {
                    debug('conflict, object already updated: %j', r.obj);
                    reject(new ConflictError(util.format('%s conflict for object %s', name, r.obj.id)));
                    return;
                }

                // Link the events to the new version of the object
                r.event.version = obj.__v;

                // TODO: save events
                debug('should save this event batch too: %j', r.event);

                resolve(obj);
            });
        }
        // Remove object
        if (r.remove) {
            r.remove.remove(function(err, obj) {
                if (err) {
                    debug('%s failed: %j', name, err);
                    reject(err);
                    return;
                }

                // TODO: save events
                debug('should save this event batch too: %j', r.event);

                resolve(obj);
            });
        }
    });
};
