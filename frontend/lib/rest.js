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
var config = require('../../lib/config');

// Modules
var core = require('../../modules/core/core');

// Frontend libs
var users = require('./api/users');
var works = require('./api/works');
var media = require('./api/media');
var annotations = require('./api/annotations');
var etag = require('./etag');


// REST-specific middlewares

/* Populate the context to be passed into the
 * core functions from the request.
 */
var setContext = function setContext(req, res, next) {
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

/* Handle all general core errors
 */
var handleErrors = function handleErrors(err, req, res, next) {
    if (err instanceof command.ConflictError) {
        if (req.context.version !== undefined) {
            debug('client requested object version not current: %j', req.context);
            res.send(412); // precondition failed
        }
        else {
            debug('conflict while updating: %s', err);
            res.send(503); // internal service error
        }
    }
    else if (err instanceof command.PermissionError) {
        debug('%s: %s', req.path, err);
        res.send(403); // forbidden
    }
    else if (err instanceof command.DuplicateKeyError) {
        res.json(409, { collection: err.collection, property: err.property });
    }
    else if (err instanceof core.NotFoundError) {
        res.send(404);
    }
    else {
        // Hand it on to next error handler
        next(err);
    }
};

/* Validate paging parameters
 */
var validatePaging = function(req, res, next) {
    req.query.page = req.query.page ? parseInt(req.query.page) : 1;
    req.query.per_page = req.query.per_page ? parseInt(req.query.per_page) : config.frontend.defaultWorksPerPage;

    if (!req.query.page || req.query.page < 1) {
        throw new Error('Invalid page requested');
    }

    if (!req.query.per_page  || req.query.per_page  < 1) {
        throw new Error('Invalid number of work per page requested');
    }

    if (req.query.per_page  > config.frontend.maxWorksPerPage) {
        throw new Error('Requested number of works per page exceeds server limit');
    }

    return next();
};

// Define the routes

var router = exports.router = express.Router();

router.route('/users/current').all(setContext)
    .get(users.getCurrentUser).all(handleErrors);

router.route('/users/:userId').all(setContext)
    .get(users.getUser)
    .put(users.updateUser)
    .patch(users.updateUser).all(handleErrors);

router.route('/works').all(setContext)
    .get(validatePaging, works.listWorks)
    .post(works.createWork).all(handleErrors);
router.route('/works/:workId').all(setContext)
    .get(works.getWork)
    .put(works.updateWork)
    .patch(works.updateWork)
    .delete(works.deleteWork).all(handleErrors);

router.route('/works/:workId/media').all(setContext)
    .post(media.createWorkMedia)
    .delete(media.unlinkAllMedia).all(handleErrors);
router.route('/works/:workId/media/:mediaId').all(setContext)
    .get(media.getWorkMedia)
    .delete(media.removeMediaFromWork).all(handleErrors);

router.route('/works/:workId/annotations').all(setContext)
    .get(annotations.getAllAnnotations)
    .post(annotations.createWorkAnnotation)
    .delete(annotations.removeAllAnnotations).all(handleErrors);
router.route('/works/:workId/annotations/:annotationId').all(setContext)
    .get(annotations.getWorkAnnotation)
    .put(annotations.updateWorkAnnotation)
    .patch(annotations.updateWorkAnnotation)
    .delete(annotations.removeWorkAnnotation).all(handleErrors);
