/*
 * Catalog web/REST frontend - REST API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:rest');

// External libs
var express = require('express');

// Common libs
var command = require('../../lib/command');

// Modules
var core = require('../../modules/core/core');

// Frontend libs
var request = require('./api/request');
var users = require('./api/users');
var organisations = require('./api/organisations');
var works = require('./api/works');
var media = require('./api/media');
var annotations = require('./api/annotations');
var sources = require('./api/sources');
var search = require('./api/search');


// REST-specific middlewares

/* Handle all general core errors in a REST API kind of way
 */
var handleErrors = function handleErrors(err, req, res, next) {
    if (err instanceof command.ConflictError) {
        if (req.context.version !== undefined) {
            debug('client requested object version not current: %j', req.context);
            res.status(412).end(); // precondition failed
        }
        else {
            debug('conflict while updating: %s', err);
            res.status(503).end(); // internal service error
        }
    }
    else if (err instanceof command.PermissionError) {
        debug('%s: %s', req.path, err);
        res.status(403).end(); // forbidden
    }
    else if (err instanceof command.DuplicateKeyError) {
        res.status(409).json({ collection: err.collection, property: err.property });
    }
    else if (err instanceof core.NotFoundError) {
        res.status(404).end();
    }
    else {
        // Hand it on to next error handler
        next(err);
    }
};

/* Validate that a REST GET endpoint is being called, and not a web
 * page one.  This mut be part of the route.VERB() middleware stack,
 * since it uses next('route').
 */
var validateAccept = function(req, res, next) {
    // By including HTML, it will be handled as a preference
    // when the client doesn't specify anything or says */*
    if (req.accepts('text/html', 'application/json') === 'application/json') {
        next();
    }
    else {
        next('route');
    }
};


/* Validate that a PUT or POST has a JSON body.  This mut be part of
 * the route.VERB() middleware stack, since it uses next('route').
 */
var validateBody = function(req, res, next) {
    if (req.is('json')) {
        next();
    }
    else {
        next('route');
    }
};


/* Validate lookup parameters
 */
var validateLookupURI = function validateLookupURI(req, res, next) {
    if (!req.query.uri) {
        return res.status(400).end();
    }

    if (req.query.context && typeof req.query.context !== 'string') {
        return res.status(400).end();
    }

    return next();
};

/* Validate lookup parameters
 */
var validateLookupHash = function validateLookupHash(req, res, next) {
    if (!req.query.hash) {
        return res.status(400).end();
    }
    return next();
};

// Define the routes

var read = exports.readRouter = express.Router();
var write = exports.writeRouter = express.Router();

read.route('/users/:userId')
    .all(validateAccept, request.setContext)
    .get(users.getUser)
    .all(handleErrors);

write.route('/users/:userId')
    .all(request.setContext)
    .put(validateBody, users.updateUser)
    .patch(validateBody, users.updateUser)
    .all(handleErrors);

read.route('/works')
    .all(validateAccept, request.setContext)
    .get(request.validatePaging, works.listWorks)
    .all(handleErrors);

write.route('/works')
    .all(request.setContext)
    .post(validateBody, works.createWork)
    .all(handleErrors);

read.route('/works/:workId')
    .all(validateAccept, request.setContext)
    .get(works.getWork)
    .all(handleErrors);

write.route('/works/:workId')
    .all(request.setContext)
    .put(validateBody, works.updateWork)
    .patch(validateBody, works.updateWork)
    .delete(works.deleteWork)
    .all(handleErrors);

write.route('/works/:workId/media')
    .all(request.setContext)
    .post(validateBody, media.createWorkMedia)
    .delete(media.unlinkAllMedia)
    .all(handleErrors);

read.route('/works/:workId/media/:mediaId')
    .all(validateAccept, request.setContext)
    .get(media.getWorkMedia)
    .all(handleErrors);

write.route('/works/:workId/media/:mediaId')
    .all(request.setContext)
    .delete(media.removeMediaFromWork)
    .all(handleErrors);

read.route('/works/:workId/annotations')
    .all(validateAccept, request.setContext)
    .get(annotations.getAllAnnotations)
    .all(handleErrors);

write.route('/works/:workId/annotations')
    .all(request.setContext)
    .post(validateBody, annotations.createWorkAnnotation)
    .delete(annotations.removeAllAnnotations)
    .all(handleErrors);

read.route('/works/:workId/annotations/:annotationId')
    .all(request.setContext)
    .get(validateAccept, annotations.getWorkAnnotation)
    .all(handleErrors);

write.route('/works/:workId/annotations/:annotationId')
    .all(request.setContext)
    .put(validateBody, annotations.updateWorkAnnotation)
    .patch(validateBody, annotations.updateWorkAnnotation)
    .delete(annotations.removeWorkAnnotation)
    .all(handleErrors);

read.route('/works/:workId/sources')
    .all(validateAccept, request.setContext)
    .get(sources.getAllSources)
    .all(handleErrors);

write.route('/works/:workId/sources')
    .all(request.setContext)
    .post(validateBody, sources.createWorkSource)
    .delete(sources.removeAllSources)
    .all(handleErrors);

read.route('/works/:workId/sources/:sourceId')
    .all(validateAccept, request.setContext)
    .get(sources.getWorkSource)
    .all(handleErrors);

write.route('/works/:workId/sources/:sourceId')
    .all(request.setContext)
    .delete(sources.removeWorkSource)
    .all(handleErrors);

write.route('/org')
    .all(request.setContext)
    .post(validateBody, organisations.createOrganisation)
    .all(handleErrors);

read.route('/org/:orgId')
    .all(validateAccept, request.setContext)
    .get(organisations.getOrganisation)
    .all(handleErrors);

read.route('/lookup/uri')
    .all(validateAccept, request.setContext)
    .get(request.validatePaging, validateLookupURI, search.lookupURI)
    .all(handleErrors);

read.route('/lookup/blockhash')
    .all(validateAccept, request.setContext)
    .get(request.validatePaging, validateLookupHash, search.lookupHash)
    .all(handleErrors);

