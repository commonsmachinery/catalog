/* Catalog core - Work object

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:work'); // jshint ignore:line

// External modules
var util = require('util');
var Promise = require('bluebird');

// Common modules
var command = require('../../../lib/command');


// Core modules
var db = require('./db');
var common = require('./common');
var media = require('./media');

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

        var perms = context.perms[work.id];
        if (!perms) {
            perms = context.perms[work.id] = {};
        }

        // Only user can modify the object
        if (context.userId && context.userId.toString() === work.owner.user.toString()) {
            perms.read = perms.write = perms.admin = true;
        }
        else {
            perms.read = work.public;
        }

        return work;
    };
};


/* Error raised when a Work object is not found.
 */
var WorkNotFoundError = exports.WorkNotFoundError = function WorkNotFoundError(id) {
    this.name = "WorkNotFoundError";
    common.NotFoundError.call(this, 'core.Work', id);
    Error.captureStackTrace(this, WorkNotFoundError);
};

util.inherits(WorkNotFoundError, common.NotFoundError);

var MediaNotFoundError = media.MediaNotFoundError;

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
            if (!(context.perms[work.id] && context.perms[work.id].read)) {
                throw new command.PermissionError(context.userId, work.id);
            }

            return work;
        })
        .then(db.Work.objectExporter(context));
};


/* Create a new Work object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new work
 */
exports.createWork = function createWork(context, src) {
    return command.execute(cmd.create, context, src)
        .then(setWorkPerms(context))
        .then(db.Work.objectExporter(context));
};

cmd.create = function commandCreateWork(context, src) {
    var dest = {
        added_by: context.userId,
        updated_by: context.userId,
        owner: {
            user: context.userId,
        }
    };

    command.copyIfSet(src, dest, 'alias');
    command.copyIfSet(src, dest, 'description');
    command.copyIfSet(src, dest, 'public');

    var work = new db.Work(dest);
    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.created',
            param: { work: work.exportObject() },
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
        .then(db.Work.objectExporter(context));
};


cmd.update = function commandUpdateWork(context, work, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [],
    });

    work.updated_at = new Date();
    work.updated_by = context.userId;

    command.updateProperties(
        src, work, ['alias', 'description', 'public'],
        event, 'core.work.changed');

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
        .then(db.Work.objectExporter(context));
};


cmd.delete = function commandDeleteWork(context, work) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].admin)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.deleted',
            param: { work: work.exportObject() },
        }],
    });

    return { remove: work, event: event };
};

/* Get a Media object for a given Work.
 *
 * Returns a promise that resolves to the media or null if not found.
 */
exports.getWorkMedia = function getWorkMedia(context, workId, mediaId) {
    common.checkId(workId, WorkNotFoundError);
    common.checkId(mediaId, MediaNotFoundError);

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
            if (!(context.perms[work.id] && context.perms[work.id].read)) {
                throw new command.PermissionError(context.userId, work.id);
            }

            if (work.media.indexOf(mediaId) === -1) {
                throw new MediaNotFoundError(mediaId);
            }

            return mediaId;
        })
        .then(function() {
            return db.Media.findByIdAsync(mediaId);
        })
        .then(db.Media.objectExporter(context));
};

/* Create a new Media object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new media
 */
exports.createWorkMedia = function createWorkMedia(context, workId, src) {
    var tempMedia;

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
            return Promise.props({
                work: work,
                media: command.execute(cmd.createMedia, context, work, src)
            });
        })
        .then(function(result) {
            tempMedia = result.media;
            return command.execute(cmd.linkMedia, context, result.work, result.media);
        })
        .then(function() {
            return tempMedia;
        })
        .then(db.Media.objectExporter(context));
};

cmd.createMedia = function commandCreateMedia(context, work, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    var dest = {
        added_by: context.userId,
    };

    command.copyIfSet(src, dest, 'annotations');
    command.copyIfSet(src, dest, 'metadata');
    command.copyIfSet(src, dest, 'replaces');

    var media = new db.Media(dest);
    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Media',
        object: media.id,
        events: [{
            event: 'core.media.created',
            param: { media: media.exportObject() },
        }],
    });

    debug('creating new media: %j', media.toObject());

    return { save: media, event: event };
};

cmd.linkMedia = function commandLinkMedia(context, work, media) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    work.media.addToSet(media.id);

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: media.id,
        events: [{
            event: 'core.work.media.added',
            param: { media_id: media.id },
        }],
    });

    return { save: work, event: event };
};

/* Delete a work media reference
 *
 * Returns a promise that resolves to the deleted media.
 */
exports.deleteWorkMedia = function deleteWorkMedia(context, workId, mediaId) {
    var tempMedia;

    common.checkId(workId, WorkNotFoundError);
    common.checkId(mediaId, MediaNotFoundError);

    return Promise.props({
            work: db.Work.findByIdAsync(workId),
            media: db.Media.findByIdAsync(mediaId)
        })
        .then(function(result) {
            if (!result.work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }
            if (!result.media) {
                debug('core.Media not found: %s', mediaId);
                throw new MediaNotFoundError(mediaId);
            }

            tempMedia = result.media;
            return result.work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
            return command.execute(cmd.deleteMedia, context, work, tempMedia);
        })
        .then(function() {
            return tempMedia;
        })
        .then(db.Media.objectExporter(context));
};


cmd.deleteMedia = function commandDeleteMedia(context, work, media) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].admin)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    if (work.media.indexOf(media.id) === -1) {
        throw new MediaNotFoundError(media.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    work.media.pull(media.id);

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.media.removed',
            param: { media_id: media.id },
        }],
    });

    return { save: work, event: event };
};

/* Unlink all work media
 *
 * Returns an empty list on success.
 */
exports.unlinkAllMedia = function unlinkAllMedia(context, workId) {
    var tempWork;

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
            // Check permissions set with setWorkPerms()
            if (!(context.perms[work.id] && context.perms[work.id].read)) {
                throw new command.PermissionError(context.userId, work.id);
            }

            tempWork = work;

            var medias = [];
            for (var i = 0; i < work.media.length; ++i) {
                medias.push(db.Media.findByIdAsync(work.media[i]));
            }
            return Promise.all(medias);
        })
        .then(function(medias) {
            for (var i = 0; i < medias.length; ++i) {
                command.execute(cmd.deleteMedia, context, tempWork, medias[i]);
            }
            return [];
        });
};
