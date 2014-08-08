/*
 * Catalog web/REST frontend - API request helper functions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:request'); // jshint ignore:line

// Frontend libs
var uris = require('../uris');
var etag = require('../etag');


/* Change an { id: x, href: y } object in place to ID property.
 */
var objectToID = function(object, prop) {
    var objectID = object && object[prop] && object[prop].id;
    if (objectID) {
        object[prop] = objectID;
    }
};

/* Change [{ id: x, href: y }] objects in place to an array of IDs.
 * Parameters:
 *   array: array with objects to transform to IDs
 *   itemProp: if not null, object[prop][n][itemProp] will be transformed instead
 */
var objectsToIDs = function(array, itemProp) {
    if (array) {
        for (var i = 0; i < array.length; i++) {
            if (itemProp && array[i] && array[i].itemProp && array[i][itemProp].id) {
                var objectID = array[i][itemProp].id;
                array[i][itemProp] = objectID;
            }
            else if (array[i] && array[i].id) {
                var objectID = array[i].id;
                array[i] = objectID;
            }
        }
    }
};

/* Transform a user object for a request. Simply returns the user
 * even though nothing is changed.
 */
exports.transformUser = function(user) {
    return user;
};


/* Transform a work object for a request, changing included objects
 * to plain IDs.
 */
exports.transformWork = function(work) {
    if (work.owner) {
        objectToID(work.owner, 'user');
    }

    objectToID(work, 'added_by');
    objectToID(work, 'updated_by');

    if (work.collabs) {
        objectsToIDs(work.collabs.users, null);
    }
    objectsToIDs(work.annotations, 'updated_by');
    objectsToIDs(work.sources, 'added_by');
    objectsToIDs(work.media, null);

    return work;
};

/* Transform a media object for a request, changing included objects
 * to plain IDs.
 */
exports.transformMedia = function(media) {
    objectToID(media, 'added_by');
    objectToID(media, 'replaces');

    return media;
};

/* Transform an annotation object for a request, changing included objects
 * to plain IDs.
 */
exports.transformAnnotation = function(annotation) {
    objectToID(annotation, 'updated_by');
    return annotation;
};

/* Transform a source object for a request, changing included objects
 * to plain IDs.
 */
exports.transformSource = function(source) {
    objectToID(source, 'added_by');
    objectToID(source, 'source_work');
};
