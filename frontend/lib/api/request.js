/*
 * Catalog web/REST frontend - API request helper functions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:request'); // jshint ignore:line

// Common libs
var config = require('../../../lib/config');

// Frontend libs
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
    var objectID;

    if (array) {
        for (var i = 0; i < array.length; i++) {
            if (itemProp && array[i] && array[i].itemProp && array[i][itemProp].id) {
                objectID = array[i][itemProp].id;
                array[i][itemProp] = objectID;
            }
            else if (array[i] && array[i].id) {
                objectID = array[i].id;
                array[i] = objectID;
            }
        }
    }
};

/* Populate the context to be passed into the
 * core functions from the request.
 */
exports.setContext = function(req, res, next) {
    req.context = {};
    if (req.session && req.session.uid) {
        req.context.userId = req.session.uid;
    }

    if (req.get('if-match')) {
        var t = etag.parse(req.get('if-match'));

        if (t) {
            debug('setting version from If-Match: %j', t);
            req.context.objectId = t.id;
            req.context.version = t.version;
        }
    }

    // Map from object IDs to permissions, collected during processing
    // (e.g. picking up access tokens)
    req.context.perms = {};

    next();
};


/* Validate paging parameters
 */
exports.validatePaging = function(req, res, next) {
    req.query.page = req.query.page && parseInt(req.query.page, 10);
    req.query.per_page = req.query.per_page && parseInt(req.query.per_page, 10);

    if (!req.query.page || req.query.page < 1) {
        req.query.page = 1;
    }

    if (!req.query.per_page || req.query.per_page < 1 ||
        req.query.per_page > config.frontend.maxWorksPerPage) {
        req.query.per_page = config.frontend.defaultWorksPerPage;
    }

    return next();
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
    objectToID(work.owner, 'user');
    objectToID(work.owner, 'org');

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

/* Transform an organisation object for a request, changing included objects
 * to plain IDs.
 */
exports.transformOrganisation = function(org) {
    objectToID(org, 'added_by');
    objectsToIDs(org.owners, null);
};

/* Convert filter query parameter to mongodb search conditions.
 */
exports.convertWorkFilter = function(req) {
    var conditions = {};
    if (!req.query.filter) {
        return conditions;
    }

    var filterFields = req.query.filter.split(',');

    for (var i=0; i<filterFields.length; i++) {
        var filterField = filterFields[i].split(':');
        if (filterField.length !== 2) {
            throw new Error('Invalid filter parameter');
        }

        var key = filterField[0];
        var value = filterField[1];

        if (key === 'owner.user' ||
            key === 'owner.org' ||
            key === 'collabs.users' ||
            key === 'collabs.groups' ||
            key === 'sources.source_work' ||
            key === 'forked_from' ||
            key === 'media') {
            conditions[key] = value;
        }
    }

    return conditions;
};

/* Convert sort query parameter to mongodb sort option.
 */
exports.convertWorkSort = function(req) {
    var sort = {};
    var sortKey;
    var sortValue;

    if (!req.query.sort) {
        return sort;
    }

    if (req.query.sort[0] === '-') {
        sortKey = req.query.sort.slice(1);
        sortValue = -1;

    } else {
        sortKey = req.query.sort;
        sortValue = 1;
    }

    if (sortKey === 'added_at' ||
        sortKey === 'updated_at') {
        sort[sortKey] = sortValue;
    }

    return sort;
};

/* Calculate number of skipped records from query parameters.
 */
exports.getSkip = function(req) {
    return req.query.per_page * (req.query.page - 1);
};

/** Calculate limit of records from query parameters.
 *
 * Always fetch one extra to be able to detect if there might be a
 * next page.  This is then stripped in respond.setPagingLinks before
 * the response is sent to the client.
 */
exports.getLimit = function(req) {
    return req.query.per_page + 1;
};
