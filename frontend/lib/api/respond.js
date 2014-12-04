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
var url = require('url');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var uris = require('../uris');
var etag = require('../etag');
var knownProperties = require('../../../lib/knownProperties');


/* Change an ID property into a { id: x, href: y } object in place.
 */
var idToObject = function(object, prop, uriBuilder) {
    var id = object && object[prop];
    if (id) {
        object[prop] = { id: id, href: uriBuilder(id) };
    }
};

/* Change an ID array property into [{ id: x, href: y }] objects in place.
 * Parameters:
 *   array: array with IDs to transform to objects
 *   itemProp: if not null, object[prop][n][itemProp] will be transformed instead
 */
var idsToObjects = function(array, itemProp, uriBuilder) {
    var id;

    if (array) {
        for (var i = 0; i < array.length; i++) {
            if (itemProp) {
                id = array[i][itemProp];
                array[i][itemProp] = { id: id, href: uriBuilder(id) };
            }
            else {
                id = array[i];
                array[i] = { id: id, href: uriBuilder(id) };
            }
        }
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

/* Filter work or media annotations using a list of property names,
 * e.g. title,locator.
 *
 * This will change the response from a plain list to a hash map,
 * only including the listed properties.
 * (all means that all properties are included in the map.)
 *
 * The keys in this map are propertyName, and the value a list of the
 * Annotations for that property sorted on score. This allows easy access
 * like annotations.title[0].property.value to show e.g. a title without
 * having to dig through the list.
 */
var filterAnnotations = function(object, annotations) {
    var annotationMap, i, a, all;

    if (typeof annotations === 'string') {
        annotations = annotations.split(',');
    }

    if (annotations.length === 1 && annotations[0] === 'all') {
        all = true;
    }

    // initialize annotation map
    annotationMap = {};
    if (!all) {
        for (i=0; i < annotations.length; i++) {
            annotationMap[annotations[i]] = [];
        }
    } else {
        for (i=0; i < object.annotations.length; i++) {
            annotationMap[object.annotations[i].property.propertyName] = [];
        }
    }

    // pick requested annotations from the object
    for (i=0; i < object.annotations.length; i++) {
        a = object.annotations[i];

        if (annotations.indexOf(a.property.propertyName) !== -1 || all) {
            annotationMap[a.property.propertyName].push(a);
        }
    }

    // sort annotations by score
    function compareScore(a, b) { return b.score - a.score; }
    for (a in annotationMap) {
        if (annotationMap.hasOwnProperty(a)) {
            annotationMap[a].sort(compareScore);
        }
    }

    return annotationMap;
};

/* Set property.value attributes for work or media annotations.
 *
 */
var setPropertyValues = function(object) {
    for (var i=0; i < object.annotations.length; i++) {
        knownProperties.setValue(object.annotations[i]);
    }
    return object;
}

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
    var incRefs;

    if(include === 'all'){
        incRefs = references;
    }
    else if (typeof include === 'string') {
        include = include.split(',');
        // By picking the references we ensure that we only process the
        // known fields and only each field once
        incRefs = _.pick(references, include);
    }
    else {
        incRefs = _.pick(references, include);
    }

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

/* Helper method to populate Organisation reference. */
var populateOrganisation = function(context, referenceObj) {
    if (!referenceObj) {
        debug('nothing to populate - this is OK if field was filtered out');
        return Promise.resolve(null);
    }

    return core.getOrganisation(context, referenceObj.id)
        .then(function(org) {
            _.extend(referenceObj, org);
        })
        .catch(function(err) {
            console.error('error populating Organisation %s: %s', referenceObj.id, err);
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
    idToObject(work.owner, 'user', uris.buildUserURI);
    idToObject(work.owner, 'org', uris.buildOrganisationURI);

    idToObject(work, 'added_by', uris.buildUserURI);
    idToObject(work, 'updated_by', uris.buildUserURI);

    if (work.collabs) {
        idsToObjects(work.collabs.users, null, uris.buildUserURI);
    }
    idsToObjects(work.annotations, 'updated_by', uris.buildUserURI);
    idsToObjects(work.media, null, function(mediaId){
        return uris.buildWorkMediaURI(work.id, mediaId);
    });

    idsToObjects(work.sources, 'added_by', uris.buildUserURI);
    idsToObjects(work.sources, 'source_work', function(sourceId){
        return uris.buildWorkMediaURI(work.id, sourceId);
    });

    // Add other fields here as those parts are supported by the API

    if ((!options || !options.include) && !options.annotations) {
        return Promise.resolve(work);
    }

    return populate(work, options.include, {
        'owner': function() {
            if (work.owner.user) {
                return populateUser(context, work.owner.user);
            } else {
                return populateOrganisation(context, work.owner.org);
            }
        },
        'added_by': function() { return populateUser(context, work.added_by); },
        'updated_by': function() { return populateUser(context, work.updated_by); },
        'annotations.updated_by': function() {
            return Promise.map(work.annotations, function(a) {
                return populateUser(context, a.updated_by);
            });
        },
        'collabs.users': function() {
            return Promise.map(work.collabs.users, function(u) {
                return populateUser(context, u);
            });
        }
    })
    .then(setPropertyValues)
    // Transform annotations to map, if requested.
    .then(function(work) {
        if (options && options.annotations && work.annotations) {
            work.annotations = filterAnnotations(work, options.annotations);
        }
        return work;
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
    idToObject(media, 'replaces', function(mediaId) {
        return uris.buildWorkMediaURI(workId, mediaId);
    });

    setPropertyValues(media);

    // Transform annotations
    if (options && options.annotations && media.annotations) {
        media.annotations = filterAnnotations(media, options.annotations);
    }

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

/* Transform a source object for a response, using fields and include
 * from option.  This always return a promise, since include may
 * require additional objects to be fetched from the core DB.
 */
exports.transformSource = function(workId, source, context, options) {
    source.href = uris.buildWorkSourceURI(workId, source.id);

    source = filterFields(source, options);

    idToObject(source, 'added_by', uris.buildUserURI);
    idToObject(source, 'source_work', uris.buildWorkURI);

    // Add other fields here as those parts are supported by the API

    if (!options || !options.include) {
        return Promise.resolve(source);
    }

    // Add referenced objects, when requested.

    return populate(source, options.include, {
        'added_by': function() { return populateUser(context, source.added_by); },
    });
};

/* Transform an organisation object for a response, using fields and include
 * from option. This always return a promise, since include may
 * require additional objects to be fetched from the core DB.
 */
exports.transformOrganisation = function(org, context, options) {
    org.href = uris.buildOrganisationURI(org.id);

    idToObject(org, 'added_by', uris.buildUserURI);

    // Add referenced objects, when requested.
    if (!options || !options.include) {
        return Promise.resolve(org);
    }

    return populate(org, options.include, {
        'added_by': function() { return populateUser(context, org.added_by); },
        'owners': function() {
            return Promise.map(org.owners, function(u) {
                return populateUser(context, u);
            });
        }
    });
};


/** Transform a single search result.
 */
exports.transformSearchResult = function(lookup) {
    if (lookup.object_type === 'core.Work') {
        var workId = lookup.object_id;
        var result;

        result = {
            href: uris.buildWorkURI(workId),
            uri: lookup.uri,
            text: lookup.text,
            property: lookup.property_type,
            score: lookup.score,
            distance: lookup.distance,
        };

        return result;
    }
    else {
        throw new Error('Unable to transform search result for %s', lookup.object_type);
    }
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

/* Set paging links for a list of search result objects according to RFC 5005.
 * Additionally returns a {first, next, previous} URL dictionary, which is
 * currently used in the web frontend.
 */
exports.setPagingLinks = function(req, res, objs) {
    var linkUrl = url.parse(req.url, true);
    var linkMap = {};

    delete linkUrl.search;
    linkUrl.query.per_page = req.query.per_page;

    linkUrl.query.page = 1;
    linkMap.first = url.format(linkUrl);

    // More than a full page of results mean there is another page.
    if (objs.length > req.query.per_page) {
        linkUrl.query.page = req.query.page + 1;
        linkMap.next = url.format(linkUrl);

        // Drop the extra item
        while (objs.length > req.query.per_page) {
            objs.pop();
        }
    }

    if (req.query.page > 1) {
        linkUrl.query.page = req.query.page - 1;
        linkMap.previous = url.format(linkUrl);
    }

    uris.setLinks(res, linkMap);

    // Now that the Link header is set, we can enrich this with number-based
    // links.  Do everything +-5 and let the GUI choose what to show
    for (var i = req.query.page - 5; i <= req.query.page + 5; i++) {
        if (i > 0 && (i <= req.query.page || linkMap.next)) {
            linkUrl.query.page = i;
            linkMap[i] = url.format(linkUrl);
        }
    }

    return linkMap;
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

        res.status(opts.status || 200).json(object);
    };
};
