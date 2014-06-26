/* Catalog core - Work object

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:work'); // jshint ignore:line

// External modules


// Common modules
var command = require('../../../lib/command');


// Core modules
var db = require('./db');
var common = require('./common');

/* Return a function that sets the permissions for this Work object in
 * the context.  It can be put in a promise chain after reading the
 * object.
 *
 * Export it so it can be unit tested.
 */
var setWorkPerms = exports.setWorkPerms = function(context) {
    return function(work) {
        if (!context.perms) {
            context.perms = {};
        }

        var perms = context.perms[context.userId];
        if (!perms) {
            perms = context.perms[context.userId] = {};
        }

        // Only user can modify the object
        if (context.userId) {
            perms.read = context.userId.toString() === work.owner.user.toString() || work.public;
            perms.write = context.userId.toString() === work.owner.user.toString();
        }

        return work;
    };
};

/*
 * Return a function that can be put last in a promise chain to turn a
 * Work object into something that can be shared with the rest of the
 * app.
 *
 * TODO: perhaps should use a transform instead, passing the context
 * in the toObject() options?
 * http://mongoosejs.com/docs/api.html#document_Document-toObject
 */
var workFilter = function(context) {
    return function(work) {
        var obj = work.toObject();

        delete obj.__v;
        obj.version = work.__v;

        obj.id = obj._id;
        delete obj._id;

        // Copy in the permissions
        obj._perms = context.perms[context.userId] || {};

        return obj;
    };
};


/* Error raised when a Work object is not found.
 */
var WorkNotFoundError = exports.WorkNotFoundError = function WorkNotFoundError(id) {
    this.name = "WorkNotFoundError";
    common.NotFoundError.call(this, 'core.Work', id);
    Error.captureStackTrace(this, WorkNotFoundError);
};

WorkNotFoundError.prototype = Object.create(common.NotFoundError.prototype);
WorkNotFoundError.prototype.constructor = WorkNotFoundError;


/* All command methods return { save: Work(), event: CoreEvent() }
 * or { remove: Work(), event: CoreEvent() }
 *
 * They are exported here just to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a Work object.
 *
 * Returns a promise that resolves to the work or null if not found.
 */
exports.getWork = function getWork(context, workId) {
    return db.Work.findByIdAsync(workId)
        .then(function(work) {
            if (!work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }

            return work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
           // Check permissions set with setWorkPerms()
            if (!(context.perms[context.userId] && context.perms[context.userId].read)) {
                throw new command.PermissionError(context.userId, work.id);
            }

            return work;
        })
        .then(workFilter(context));
};


/* Create a new Work object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new work
 */
exports.createWork = function createWork(context, src) {
    return command.execute(cmd.create, context, src)
        .then(setWorkPerms(context))
        .then(workFilter(context));
};

cmd.create = function commandCreateWork(context, src, forkFrom) {
    var dest = {
        added_by: context.userId,
        updated_by: context.userId,
        owner: {
            user: context.userId,
        }
    };

    //command.copyIfSet(src, dest, 'forked_from');
    if (forkFrom) {
        dest.forked_from = forkFrom;
    }

    command.copyIfSet(src, dest, 'alias');
    command.copyIfSet(src, dest, 'description');
    command.copyIfSet(src, dest, 'public');
    command.copyIfSet(src, dest, 'collabs');
    command.copyIfSet(src, dest, 'annotations');
    command.copyIfSet(src, dest, 'sources');
    command.copyIfSet(src, dest, 'media');

    var work = new db.Work(dest);
    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            type: 'work.created',
            param: { work: work.toObject() },
        }],
    });

    debug('creating new work: %j', work.toObject());

    return { save: work, event: event };
};

/* Update a Work object from a source object.
 *
 * Returns a promise that resolves to the updated work.
 */
exports.updateWork = function updateWork(context, workId, src) {
    common.checkId(workId, WorkNotFoundError);

    return db.Work.findByIdAsync(workId)
        .then(function(work) {
            if (!work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }

            return work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
            return command.execute(cmd.update, context, work, src);
        })
        .then(workFilter(context));
};


cmd.update = function commandUpdateWork(context, work, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[context.userId] && context.perms[context.userId].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            type: 'work.updated',
            param: { work: work.toObject() },
        }],
    });

    command.updateProperty(src, work, 'alias',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'description',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'public',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'collabs',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'annotations',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'sources',
        event, 'work.%s.changed');
    command.updateProperty(src, work, 'media',
        event, 'work.%s.changed');

    return { save: work, event: event };
};

/* Delete a Work
 *
 * Returns a promise that resolves to the updated work.
 */
exports.deleteWork = function deleteWork(context, workId) {
    common.checkId(workId, WorkNotFoundError);

    return db.Work.findByIdAsync(workId)
        .then(function(work) {
            if (!work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }

            return work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
            return command.execute(cmd.delete, context, work);
        })
        .then(workFilter(context));
};


cmd.delete = function commandDeleteWork(context, work) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[context.userId] && context.perms[context.userId].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            type: 'work.deleted',
            param: { work: work.toObject() },
        }],
    });

    return { remove: work, event: event };
};