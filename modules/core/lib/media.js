/* Catalog core - Media object

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:media'); // jshint ignore:line

// External modules
var util = require('util');

// Common modules

// Core modules
var db = require('./db');
var common = require('./common');

/* Error raised when a Media object is not found.
 */
var MediaNotFoundError = exports.MediaNotFoundError = function MediaNotFoundError(id) {
    this.name = "MediaNotFoundError";
    common.NotFoundError.call(this, 'core.Media', id);
    Error.captureStackTrace(this, MediaNotFoundError);
};

util.inherits(MediaNotFoundError, common.NotFoundError);


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
        .then(db.Media.objectExporter(context));
};
