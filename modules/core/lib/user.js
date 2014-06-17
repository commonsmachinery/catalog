/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:user'); // jshint ignore:line

// External modules


// Common modules
var command = require('../../../lib/command');
var gravatar = require('../../../lib/gravatar');


// Core modules
var db = require('./db');


// Helper functions
var copyIfSet = function copy_if_set(src, dest, prop) {
    if (src && src[prop]) {
        dest[prop] = src[prop];
    }
};


/* Error raised when a User object is not found.
 */
var UserNotFoundError = exports.UserNotFoundError = function UserNotFoundError(id) {
    this.message = 'core.User not found: ' + id;
    this.name = "UserNotFoundError";
    Error.captureStackTrace(this, UserNotFoundError);
};

UserNotFoundError.prototype = Object.create(Error.prototype);
UserNotFoundError.prototype.constructor = UserNotFoundError;

/* All command methods return { obj: User(), events: [] }.  Export
 * them to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a User object.
 *
 * Returns a promise that resolves to the user or null if not found.
 */
exports.get_user = function get_user(id) {
    return db.User.findByIdAsync(id)
        .then(function(user) {
            if (!user) {
                debug('core.User not found: %s', id);
                throw new UserNotFoundError(id);
            }

            return user.toObject();
        });
};


/* Create a new User object from a source object with the same
 * properties.
 *
 * An _id property must be included in src, to link users to an
 * already created auth.UserAccess object.
 *
 * Returns a promise that resolves to the new user
 */
exports.create_user = function create_user(src) {
    return command.execute(cmd.create, src)
        .then(function(user) {
            return user.toObject();
        });
};

cmd.create = function command_create_user(src) {
    if (!src._id) {
        throw new command.CommandError('src._id missing');
    }

    var dest = {
        _id: src._id,
        added_by: src._id,
        updated_by: src._id,
        profile: {},
    };

    copyIfSet(src, dest, 'alias');
    copyIfSet(src.profile, dest.profile, 'name');
    copyIfSet(src.profile, dest.profile, 'email');
    copyIfSet(src.profile, dest.profile, 'location');
    copyIfSet(src.profile, dest.profile, 'website');
    copyIfSet(src.profile, dest.profile, 'gravatar_email');

    // Always set gravatar hash, falling back on object ID
    dest.profile.gravatar_hash = gravatar.emailHash(
        dest.profile.gravatar_email || dest._id.toString());

    var user = new db.User(dest);
    var event = new db.CoreEvent({
        user: user.id,
        type: 'core.User',
        object: user.id,
        events: [{
            type: 'user.created',
            param: { user: user.toObject() },
        }],
    });

    debug('creating new user: %j', user.toObject());

    return { obj: user, event: event };
};
