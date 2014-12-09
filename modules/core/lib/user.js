/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:user'); // jshint ignore:line

// External modules
var util = require('util');

// Common modules
var command = require('../../../lib/command');
var gravatar = require('../../../lib/gravatar');


// Core modules
var db = require('./db');
var common = require('./common');

/* Return a function that sets the permissions for this User object in
 * the context.  It can be put in a promise chain after reading the
 * object.
 *
 * Export it so it can be unit tested.
 */
var setUserPerms = exports.setUserPerms = function(context) {
    return function(user) {
        if (!context.perms) {
            context.perms = {};
        }

        var perms = context.perms[user.id];
        if (!perms) {
            perms = context.perms[user.id] = {};
        }

        // Only user can modify the object
        if (context.userId && context.userId.toString() === user.id.toString()) {
            perms.write = true;
        }

        return user;
    };
};


/* Error raised when a User object is not found.
 */
var UserNotFoundError = exports.UserNotFoundError = function UserNotFoundError(id) {
    this.name = "UserNotFoundError";
    common.NotFoundError.call(this, 'core.User', id);
    Error.captureStackTrace(this, UserNotFoundError);
};

util.inherits(UserNotFoundError, common.NotFoundError);


/* All command methods return { save: User(), event: CoreEvent() }
 * or { remove: User(), event: CoreEvent() }
 *
 * They are exported here just to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a User object.
 *
 * Returns a promise that resolves to the user or null if not found.
 */
exports.getUser = function getUser(context, userId) {
    common.checkId(userId, UserNotFoundError);

    return db.User.findByIdAsync(userId)
        .then(function(user) {
            if (!user) {
                debug('core.User not found: %s', userId);
                throw new UserNotFoundError(userId);
            }

            // this enables setting CORS header for users
            context.setCORS = true;

            return user;
        })
        .then(setUserPerms(context))
        .then(db.User.objectExporter(context));
};

/* Get a User object by alias.
 *
 * Returns a promise that resolves to the user or null if not found.
 */
exports.getUserByAlias = function getUserByAlias(context, alias) {
    return db.User.findAsync({ alias: alias })
        .then(function(result) {
            if (result.length === 0) {
                debug('core.User not found by alias: %s', alias);
                throw new UserNotFoundError(alias);
            }

            return result[0];
        })
        .then(setUserPerms(context))
        .then(db.User.objectExporter(context));
};



/* Create a new User object from a source object with the same
 * properties.
 *
 * An id property must be included in src, to link users to an
 * already created auth.UserAccess object.
 *
 * Returns a promise that resolves to the new user
 */
exports.createUser = function createUser(context, src) {
    return command.execute(cmd.create, context, src)
        .then(setUserPerms(context))
        .then(db.User.objectExporter(context));
};

cmd.create = function commandCreateUser(context, src) {
    if (!src.id) {
        throw new command.CommandError('src.id missing');
    }

    var dest = {
        _id: src.id,
        added_by: context.userId,
        updated_by: context.userId,
        profile: {},
    };

    command.copyIfSet(src, dest, 'alias');
    command.copyIfSet(src.profile, dest.profile, 'name');
    command.copyIfSet(src.profile, dest.profile, 'email');
    command.copyIfSet(src.profile, dest.profile, 'location');
    command.copyIfSet(src.profile, dest.profile, 'website');
    command.copyIfSet(src.profile, dest.profile, 'gravatar_email');

    // Always set gravatar hash, falling back on object ID
    dest.profile.gravatar_hash = gravatar.emailHash(
        dest.profile.gravatar_email || dest._id.toString());

    var user = new db.User(dest);
    var event = new db.CoreEvent({
        user: user.id,
        type: 'core.User',
        object: user.id,
        events: [{
            event: 'core.user.created',
            param: { user: user.exportObject() },
        }],
    });

    debug('creating new user: %j', user.toObject());

    return { save: user, event: event };
};


/* Update a User object from a source object.
 *
 * Returns a promise that resolves to the updated user.
 */
exports.updateUser = function updateUser(context, userId, src) {
    common.checkId(userId, UserNotFoundError);

    return db.User.findByIdAsync(userId)
        .then(function(user) {
            if (!user) {
                debug('core.User not found: %s', userId);
                throw new UserNotFoundError(userId);
            }

            return user;
        })
        .then(setUserPerms(context))
        .then(function(user) {
            return command.execute(cmd.update, context, user, src);
        })
        .then(db.User.objectExporter(context));
};


cmd.update = function commandUpdateUser(context, user, src) {
    // Check permissions set with setUserPerms()
    if (!(context.perms[user.id] && context.perms[user.id].write)) {
        throw new command.PermissionError(context.userId, user.id);
    }

    command.checkVersionConflict(context, user);

    // OK to apply update, so get a new version
    user.increment();

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.User',
        object: user.id,
        events: [],
    });

    user.updated_at = new Date();
    user.updated_by = context.userId;

    command.updateProperty(src, user, 'alias', event, 'core.user.changed');

    if (typeof src.profile === 'object') {
        command.updateProperties(
            src.profile, user.profile,
            [ 'name', 'email', 'location', 'website' ],
            event, 'core.user.changed.profile');

        if (command.updateProperty(src.profile, user.profile, 'gravatar_email',
                                   event, 'core.user.changed.profile')) {

            // Update the gravatar hash on email changes
            user.profile.gravatar_hash = gravatar.emailHash(
                user.profile.gravatar_email || user.id);
        }
    }

    return { save: user, event: event };
};
