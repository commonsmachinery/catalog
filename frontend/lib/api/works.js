/*
 * Catalog web/REST frontend - works API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:works'); // jshint ignore:line

// External libs
var _ = require('underscore');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');

/* Return promise handler to transform the work object for JSON responses.
 */
var transform = function(req) {
    return function(work) {
        return respond.transformWork(
            work, req.context,
            _.pick(req.query, 'fields', 'include', 'annotations'));
    };
};

exports.createWork = function createWork(req, res, next) {
    core.createWork(req.context, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.getWork = function getWork(req, res, next) {
    var htmlResponse = function() {
        core.getWork(req.context, req.params.workId)
            .then(function(work) {
                // Populate useful fields
                return respond.transformWork(
                    work, req.context, {
                        include: ['owner', 'added_by', 'updated_by']
                    });
            })
            .then(function(work) {
                respond.setObjectHeaders(res, work);
                res.locals.work = work;
                res.render('workPermalink');
            })
            .catch(function(err) {
                next(err);
            });
    };

    var jsonResponse = function() {
        core.getWork(req.context, req.params.workId)
            .then(transform(req))
            .then(respond.asJSON(res))
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        html: htmlResponse,
        default: htmlResponse,
        json: jsonResponse,
    });
};

exports.updateWork = function updateWork(req, res, next) {
    core.updateWork(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.deleteWork = function deleteWork(req, res, next) {
    core.deleteWork(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
