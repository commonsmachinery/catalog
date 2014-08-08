/* Catalog core - Work object

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:work'); // jshint ignore:line

// External modules
var util = require('util');
var Promise = require('bluebird');
var _ = require('underscore');

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

/* Error raised when a Work annotation object is not found.
 */
var AnnotationNotFoundError = exports.AnnotationNotFoundError = function AnnotationNotFoundError(id) {
    this.name = "AnnotationNotFoundError";
    common.NotFoundError.call(this, 'core.WorkAnnotation', id);
    Error.captureStackTrace(this, AnnotationNotFoundError);
};

util.inherits(AnnotationNotFoundError, common.NotFoundError);

/* Error raised when a Work source object is not found.
 */
var SourceNotFoundError = exports.SourceNotFoundError = function SourceNotFoundError(id) {
    this.name = "SourceNotFoundError";
    common.NotFoundError.call(this, 'core.Source', id);
    Error.captureStackTrace(this, SourceNotFoundError);
};

util.inherits(SourceNotFoundError, common.NotFoundError);

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
            return command.execute(cmd.linkMedia, context, result.work, result.media).return(result.media);
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
        object: work.id,
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
exports.removeMediaFromWork = function removeMediaFromWork(context, workId, mediaId) {
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
            return command.execute(cmd.removeMedia, context, work, tempMedia);
        })
        .then(function() {
            return tempMedia;
        })
        .then(db.Media.objectExporter(context));
};

cmd.removeMedia = function commandRemoveMedia(context, work, media) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
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
            return command.execute(cmd.unlinkAllMedia, context, work).return([]);
        });
};

cmd.unlinkAllMedia = function commandUnlinkAllMedia(context, work) {
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

    for (var i = 0; i < work.media.length; ++i) {
        event.events.push({
            event: 'core.work.media.removed',
            param: { media_id: work.media[i] },
        });
    }

    work.media = [];

    return { save: work, event: event };
};

/* Link existing media to a work.
 *
 * Returns a promise that resolves to the media.
 */
exports.addMediaToWork = function addMediaToWork(context, workId, origWorkId, origMediaId) {
    var tempMedia;
    var origContext;

    common.checkId(workId, WorkNotFoundError);
    common.checkId(origWorkId, WorkNotFoundError);
    common.checkId(origMediaId, MediaNotFoundError);

    return Promise.props({
            work: db.Work.findByIdAsync(workId),
            origWork: db.Work.findByIdAsync(origWorkId),
            origMedia: db.Media.findByIdAsync(origMediaId)
        })
        .then(function(result) {
            if (!result.work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }
            if (!result.origWork) {
                debug('core.Work not found: %s', origWorkId);
                throw new WorkNotFoundError(origWorkId);
            }
            if (!result.origMedia) {
                debug('core.Media not found: %s', origMediaId);
                throw new MediaNotFoundError(origMediaId);
            }

            // check if we have read permission for origWork
            origContext = _.clone(context);
            setWorkPerms(origContext)(result.origWork);

            // Check permissions set with setWorkPerms()
            if (!(origContext.perms[result.origWork.id] && origContext.perms[result.origWork.id].read)) {
                throw new command.PermissionError(origContext.userId, result.origWork.id);
            }

            tempMedia = result.origMedia;
            return result.work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
            return command.execute(cmd.linkMedia, context, work, tempMedia);
        })
        .then(function() {
            return tempMedia;
        })
        .then(db.Media.objectExporter(context));
};

/* Create a new Annotation object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new annotation
 */
exports.createWorkAnnotation = function createWorkAnnotation(context, workId, src) {
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
            return command.execute(cmd.createWorkAnnotation, context, work, src);
        })
        // return annotation to match the API
        .then(function(work) {
            return work.annotations[work.annotations.length - 1];
        })
        .then(db.WorkAnnotation.objectExporter(context));
};

cmd.createWorkAnnotation = function commandCreateWorkAnnotation(context, work, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    var dest = {
        updated_by: context.userId
    };

    command.copyIfSet(src, dest, 'property');
    command.copyIfSet(src, dest, 'score');

    work.annotations.push(dest);
    var annotation = work.annotations[work.annotations.length - 1];

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.annotation.added',
            param: { annotation: annotation.exportObject() },
        }],
    });

    debug('creating new annotation: %j', annotation.toObject());

    return { save: work, event: event };
};

/* Get an Annotation object for a given Work.
 *
 * Returns a promise that resolves to the annotation or null if not found.
 */
exports.getWorkAnnotation = function getWorkAnnotation(context, workId, annotationId) {
    common.checkId(workId, WorkNotFoundError);
    common.checkId(annotationId, AnnotationNotFoundError);

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

            var annotation = work.annotations.id(annotationId);

            if (!annotation) {
                throw new AnnotationNotFoundError(annotationId);
            }

            return annotation;
        })
        .then(db.WorkAnnotation.objectExporter(context));
};

/* Get an Annotation object for a given Work.
 *
 * Returns a promise that resolves to the annotation or null if not found.
 */
exports.getAllAnnotations = function getAllAnnotations(context, workId) {
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

            return work.annotations;
        })
        .then(function(annotations) {
            return annotations.map(function(annotation) {
                return db.WorkAnnotation.objectExporter(context)(annotation);
            });
        });
};

/* Update a Work annotation from a source object.
 *
 * Returns a promise that resolves to the updated annotation.
 */
exports.updateWorkAnnotation = function updateWorkAnnotation(context, workId, annotationId, src) {
    common.checkId(workId, WorkNotFoundError);
    common.checkId(annotationId, AnnotationNotFoundError);

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
            return command.execute(cmd.updateAnnotation, context, work, annotationId, src);
        })
        // return annotation to match the API
        .then(function(work) {
            return work.annotations.id(annotationId);
        })
        .then(db.WorkAnnotation.objectExporter(context));
};

cmd.updateAnnotation = function commandUpdateAnnotation(context, work, annotationId, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    var annotation = work.annotations.id(annotationId);
    var old_annotation = annotation.exportObject();
    if (!annotation) {
        throw new AnnotationNotFoundError(annotationId);
    }

    var props = ['property', 'score'];
    var changed = false;

    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        var newValue = src[prop] === null ? undefined : src[prop];
        if (annotation[prop] !== newValue) {
            annotation[prop] = newValue;
            changed = true;
        }
    }

    if (changed) {
        // OK to apply update, so get a new version
        work.increment();

        var event = new db.CoreEvent({
            user: context.userId,
            type: 'core.Work',
            object: work.id,
            events: [{
                event: 'core.work.annotation.changed',
                param: {
                    old_annotation: old_annotation,
                    new_annotation: annotation.exportObject()
                },
            }],
        });

        return { save: work, event: event };
    }
    else {
        return { save: work, event: null };
    }
};

/* Remove work annotation
 *
 * Returns a promise that resolves to removed annotation.
 */
exports.removeWorkAnnotation = function removeWorkAnnotation(context, workId, annotationId) {
    var origAnnotation;

    common.checkId(workId, WorkNotFoundError);
    common.checkId(annotationId, AnnotationNotFoundError);

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
            origAnnotation = work.annotations.id(annotationId);
            if (!origAnnotation) {
                throw new AnnotationNotFoundError(annotationId);
            }

            return command.execute(cmd.removeWorkAnnotation, context, work, annotationId).return(origAnnotation);
        })
        .then(db.WorkAnnotation.objectExporter(context));
};

cmd.removeWorkAnnotation = function commandRemoveWorkAnnotation(context, work, annotation) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    work.annotations.pull(annotation);

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.annotation.removed',
            param: { annotation: annotation }
        }],
    });

    return { save: work, event: event };
};

/* Remove all work annotations
 *
 * Returns an empty list on success.
 */
exports.removeAllAnnotations = function removeAllAnnotations(context, workId) {
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
            return command.execute(cmd.removeAllAnnotations, context, work).return([]);
        });
};

cmd.removeAllAnnotations = function commandRemoveAllAnnotations(context, work) {
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

    for (var i = 0; i < work.annotations.length; ++i) {
        event.events.push({
            event: 'core.work.annotation.removed',
            param: { annotation: work.annotations[i] },
        });
    }

    work.annotations = [];

    return { save: work, event: event };
};

/* Get a list of Works.
 *
 * Returns a promise that resolves to the list of works
 * or empty list if no matching works found.
 */
exports.listWorks = function listWorks(context, conditions, sort, skip, limit) {
    if (context.userId) {
        conditions = _.extend({$or: [{
            'owner.user': context.userId
        }, {
            'public': true
        }]}, conditions);
    }
    else {
        conditions = _.extend({
            'public': true
        }, conditions);
    }

    return db.Work.findAsync(
        conditions, null,
        {
            sort: sort,
            skip: skip,
            limit: limit
        }
    )
    .map(function(work) {
        return db.Work.objectExporter(context)(work);
    });
};

/* Get an Source object for a given Work.
 *
 * Returns a promise that resolves to the source.
 */
exports.getWorkSource = function getWorkSource(context, workId, sourceId) {
    common.checkId(workId, WorkNotFoundError);
    common.checkId(sourceId, SourceNotFoundError);

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

            var source = work.sources.id(sourceId);

            if (!source) {
                throw new SourceNotFoundError(sourceId);
            }

            return source;
        })
        .then(db.Source.objectExporter(context));
};

/* Get all Source objects for a given Work.
 *
 * Returns a promise that resolves to the list of sources.
 */
exports.getAllSources = function getAllSources(context, workId) {
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

            return work.sources;
        })
        .then(function(sources) {
            return sources.map(function(source) {
                return db.Source.objectExporter(context)(source);
            });
        });
};

/* Create a new Source object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new source
 */
exports.createWorkSource = function createWorkSource(context, workId, src) {
    common.checkId(workId, WorkNotFoundError);
    common.checkId(src.source_work, WorkNotFoundError);

    return Promise.props({
            work: db.Work.findByIdAsync(workId),
            sourceWork: db.Work.findByIdAsync(src.source_work)
        })
        .then(function(result) {
            if (!result.work) {
                debug('core.Work not found: %s', workId);
                throw new WorkNotFoundError(workId);
            }

            if (!result.sourceWork) {
                debug('core.Work (source_work) not found: %s', src.source_work);
                throw new WorkNotFoundError(src.source_work);
            }

            return result.work;
        })
        .then(setWorkPerms(context))
        .then(function(work) {
            return command.execute(cmd.createWorkSource, context, work, src);
        })
        // return source according to the API
        .then(function(work) {
            return work.sources[work.sources.length - 1];
        })
        .then(db.Source.objectExporter(context));
};

cmd.createWorkSource = function commandCreateWorkSource(context, work, src) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    if (!src.source_work) {
        // TODO: should we implement error type and handler for this error?
        throw new command.CommandError('src.source_work missing');
    }

    // Check that work doesn't already have src.source_work
    if (_.find(work.sources, function(s) {
        return s.source_work.toString() === src.source_work;
    })) {
        // TODO: should we implement error type and handler for this error?
        throw new command.CommandError('duplicate src.source_work');
    }

    // OK to apply update, so get a new version
    work.increment();

    var dest = {
        added_by: context.userId
    };

    dest.source_work = src.source_work;

    work.sources.push(dest);
    var source = work.sources[work.sources.length - 1];

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.source.added',
            param: { source: source.exportObject() },
        }],
    });

    debug('creating new source: %j', source.toObject());

    return { save: work, event: event };
};

/* Remove work source
 *
 * Returns a promise that resolves to removed source.
 */
exports.removeWorkSource = function removeWorkSource(context, workId, sourceId) {
    var origSource;

    common.checkId(workId, WorkNotFoundError);
    common.checkId(sourceId, SourceNotFoundError);

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
            origSource = work.sources.id(sourceId);
            if (!origSource) {
                throw new SourceNotFoundError(sourceId);
            }

            return command.execute(cmd.removeWorkSource, context, work, sourceId).return(origSource);
        })
        .then(db.Source.objectExporter(context));
};

cmd.removeWorkSource = function commandRemoveWorkSource(context, work, source) {
    // Check permissions set with setWorkPerms()
    if (!(context.perms[work.id] && context.perms[work.id].write)) {
        throw new command.PermissionError(context.userId, work.id);
    }

    command.checkVersionConflict(context, work);

    // OK to apply update, so get a new version
    work.increment();

    work.sources.pull(source);

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Work',
        object: work.id,
        events: [{
            event: 'core.work.source.removed',
            param: { source: source }
        }],
    });

    return { save: work, event: event };
};

/* Remove all work sources
 *
 * Returns an empty list on success.
 */
exports.removeAllSources = function removeAllSources(context, workId) {
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
            return command.execute(cmd.removeAllSources, context, work).return([]);
        });
};

cmd.removeAllSources = function commandRemoveAllSources(context, work) {
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

    for (var i = 0; i < work.sources.length; ++i) {
        event.events.push({
            event: 'core.work.source.removed',
            param: { source: work.sources[i] },
        });
    }

    work.sources = [];

    return { save: work, event: event };
};
