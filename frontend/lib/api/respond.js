/*
 * Catalog web/REST frontend - API response helper functions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:respond'); // jshint ignore:line

// External libs
var Promise = require('bluebird');
var _ = require('underscore');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var uris = require('../uris');
var etag = require('../etag');


/* Change an ID property into a { id: x, href: y } object in place.
 */
var idToObject = function(object, prop, uriBuilder) {
    var id = object && object[prop];
    if (id) {
        object[prop] = { id: id, href: uriBuilder(id) };
    }
};


/* Filter fields in an object before responding.
 *
 * Parameters:
 *   object: the object to filter
 *   options.fields: comma-separated string of fields to
 *       include or exclude (if preceeded with -)
 *   options.include: list or comma-separated string of fields
 *       to populate (will override fields)
 */
var filterFields = function(object, options) {
    if (!options) {
        return object;
    }

    var fields = options.fields;
    var exclude = false;
    var newObj;

    if (fields && fields[0] === '-') {
        exclude = true;
        fields = fields.slice(1);
    }

    if (!fields) {
        return object;
    }

    fields = fields.split(',');

    if (exclude) {
        newObj = _.omit(object, fields);
    }
    else {
        newObj = _.pick(object, fields);
    }

    // Ensure we have core properties always
    newObj.id = object.id;
    newObj.href = object.href;
    newObj.version = object.version;
    newObj._perms = object._perms;

    // And that all populated objects are included too
    if (options.include) {
        var include = (typeof options.include === 'string' ?
                       options.include.split(',') : options.include);

        _.extend(newObj, _.pick(object, include));
    }

    return newObj;
};

/* Populate referenced objects if requested by the caller.  Returns a
 * promise that resolved to the populated object.  Any errors while
 * populating will be logged but not propagated.
 *
 * Parameters:
 *   object:     the object to populate
 *   include:    list or a comma-separated list of fields to populate
 *   references: a map of fields to a function that populates that field,
 *               return a promise that resolves when done.
 */
var populate = function(object, include, references)
{
    if (typeof include === 'string') {
        include = include.split(',');
    }

    // By picking the references we ensure that we only process the
    // known fields and only each field once

    var incRefs = _.pick(references, include);
    var field;
    var fetching = [];

    for (field in incRefs) {
        if (incRefs.hasOwnProperty(field)) {
            fetching.push(incRefs[field]());
        }
    }

    return Promise.settle(fetching)
        .then(function(res) {
            debug('object population done for %s', object.href);
            return object;
        })
        .catch(function(res) {
            debug('error during object population for %s: %s', object.href, res);
            return object;
        });
};


/* Helper method to populate a User reference. */
var populateUser = function(context, referenceObj) {
    if (!referenceObj) {
        debug('nothing to populate - this is OK if field was filtered out');
        return Promise.resolve(null);
    }

    return core.getUser(context, referenceObj.id)
        .then(function(user) {
            _.extend(referenceObj, user);
        })
        .catch(function(err) {
            console.error('error populating User %s: %s', referenceObj.id, err);
        });
};


/* Transform a user object for a response.  To be consistent
 * with other transform functions, this returns a promise
 * even though nothing more will be loaded from the core DB.
 */
exports.transformUser = function(user) {
    user.href = uris.buildUserURI(user.id);
    return Promise.resolve(user);
};


/* Transform a work object for a response, using fields and include
 * from option.  This always return a promise, since include may
 * require additional objects to be fetched from the core DB.
 */
exports.transformWork = function(work, context, options) {
    work.href = uris.buildWorkURI(work.id);

    work = filterFields(work, options);

    // Transform object references
    if (work.owner) {
        idToObject(work.owner, 'user', uris.buildUserURI);
    }
    idToObject(work, 'added_by', uris.buildUserURI);
    idToObject(work, 'updated_by', uris.buildUserURI);

    // Add other fields here as those parts are supported by the API

    if (!options || !options.include) {
        return Promise.resolve(work);
    }

    // Add referenced objects, when requested.

    return populate(work, options.include, {
        'owner': function() { return populateUser(context, work.owner && work.owner.user); },
        'added_by': function() { return populateUser(context, work.added_by); },
        'updated_by': function() { return populateUser(context, work.updated_by); },
    });
};

/* Helper method to populate a Media reference. */
var populateMedia = function(context, referenceObj) {
    if (!referenceObj) {
        debug('nothing to populate - this is OK if field was filtered out');
        return Promise.resolve(null);
    }

    return core.getMedia(context, referenceObj.id)
        .then(function(media) {
            _.extend(referenceObj, media);
        })
        .catch(function(err) {
            console.error('error populating Media %s: %s', referenceObj.id, err);
        });
};

/* Transform a media object for a response, using fields and include
 * from option.  This always return a promise, since include may
 * require additional objects to be fetched from the core DB.
 */
exports.transformMedia = function(workId, media, context, options) {
    media.href = uris.buildWorkMediaURI(workId, media.id);

    media = filterFields(media, options);

    idToObject(media, 'added_by', uris.buildUserURI);
    media.replaces = { id: media.replaces, href: uris.buildWorkMediaURI(workId, media.id) };

    // Add other fields here as those parts are supported by the API

    if (!options || !options.include) {
        return Promise.resolve(media);
    }

    // Add referenced objects, when requested.

    return populate(media, options.include, {
        'added_by': function() { return populateUser(context, media.added_by); },
        'replaces': function() { return populateMedia(context, media.replaces); },
    });
};

/* Transform an annotation object for a response, using fields and include
 * from option.  This always return a promise, since include may
 * require additional objects to be fetched from the core DB.
 */
exports.transformAnnotation = function(workId, annotation, context, options) {
    annotation.href = uris.buildWorkAnnotationURI(workId, annotation.id);

    annotation = filterFields(annotation, options);

    idToObject(annotation, 'updated_by', uris.buildUserURI);

    // Add other fields here as those parts are supported by the API

    if (!options || !options.include) {
        return Promise.resolve(annotation);
    }

    // Add referenced objects, when requested.

    return populate(annotation, options.include, {
        'updated_by': function() { return populateUser(context, annotation.updated_by); },
    });
};

/* Set all relevant response headers for an object.
 */
var setObjectHeaders = exports.setObjectHeaders = function(res, object) {
    etag.set(res, object);
    uris.setLinks(res, { self: object.href });

    if (object.updated_at) {
        res.set('Last-Modified', object.updated_at.toUTCString());
    }
    else if (object.added_at) {
        res.set('Last-Modified', object.added_at.toUTCString());
    }
};


/* Return a JSON response handler for a promise chain.
 *
 * Options:
 *   status: response status, if not 200.
 */
exports.asJSON = function(res, options) {
    var opts = options || {};

    return function(object) {
        setObjectHeaders(res, object);

        if (opts.status === 201) {
            res.set('Location', object.href);
        }

        res.json(opts.status || 200, object);
    };
};
