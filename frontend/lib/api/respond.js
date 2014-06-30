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
    var id = object[prop];
    if (id) {
        object[prop] = { id: id, href: uriBuilder(id) };
    }
};


/* Populate referenced objects if requested by the caller.  Returns a
 * promise that resolved to the populated object.  Any errors while
 * populating will be logged but not propagated.
 *
 * Parameters:
 *   object:     the object to populate
 *   include:    a comma-separated list of fields to populate
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
    var opts = options || {};

    work.href = uris.buildWorkURI(work.id);

    // TODO: process options.fields

    // Transform object references
    idToObject(work.owner, 'user', uris.buildUserURI);
    idToObject(work, 'added_by', uris.buildUserURI);
    idToObject(work, 'updated_by', uris.buildUserURI);

    // Add other fields here as those parts are supported by the API

    if (!opts.include) {
        return Promise.resolve(work);
    }

    // Add referenced objects, when requested.

    return populate(work, opts.include, {
        'owner': function() { return populateUser(context, work.owner.user); },
        'added_by': function() { return populateUser(context, work.added_by); },
        'updated_by': function() { return populateUser(context, work.updated_by); },
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