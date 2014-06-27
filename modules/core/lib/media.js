/* Catalog core - Media object

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:media'); // jshint ignore:line

// External modules


// Common modules
var command = require('../../../lib/command');


// Core modules
var db = require('./db');
var common = require('./common');

/*
 * Return a function that can be put last in a promise chain to turn a
 * Media object into something that can be shared with the rest of the
 * app.
 *
 * TODO: perhaps should use a transform instead, passing the context
 * in the toObject() options?
 * http://mongoosejs.com/docs/api.html#document_Document-toObject
 */
var mediaFilter = function(context) {
    return function(media) {
        var obj = media.toObject();

        obj.id = obj._id;
        delete obj._id;

        return obj;
    };
};


/* Error raised when a Media object is not found.
 */
var MediaNotFoundError = exports.MediaNotFoundError = function MediaNotFoundError(id) {
    this.name = "MediaNotFoundError";
    common.NotFoundError.call(this, 'core.Media', id);
    Error.captureStackTrace(this, MediaNotFoundError);
};

MediaNotFoundError.prototype = Object.create(Error.prototype);
MediaNotFoundError.prototype.constructor = MediaNotFoundError;


/* All command methods return { save: Media(), event: CoreEvent() }
 * or { remove: Media(), event: CoreEvent() }
 *
 * They are exported here just to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a Media object.
 *
 * Returns a promise that resolves to the media or null if not found.
 */
exports.getMedia = function getMedia(context, mediaId) {
    return db.Media.findByIdAsync(mediaId)
        .then(function(media) {
            if (!media) {
                debug('core.Media not found: %s', mediaId);
                throw new MediaNotFoundError(mediaId);
            }

            return media;
        })
        .then(mediaFilter(context));
};


/* Create a new Media object from a source object with the same
 * properties.
 *
 * Returns a promise that resolves to the new media
 */
exports.createMedia = function createMedia(context, src) {
    return command.execute(cmd.create, context, src)
        .then(mediaFilter(context));
};

cmd.create = function commandCreateMedia(context, src, replaces) {
    var dest = {
        added_by: context.userId,
    };

    if (replaces) {
        dest.replaces = replaces;
    }

    command.copyIfSet(src, dest, 'annotations');
    command.copyIfSet(src, dest, 'metadata');

    var media = new db.Media(dest);
    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Media',
        object: media.id,
        events: [{
            type: 'media.created',
            param: { media: media.toObject() },
        }],
    });

    debug('creating new media: %j', media.toObject());

    return { save: media, event: event };
};
