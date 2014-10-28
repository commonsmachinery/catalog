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
var Promise = require('bluebird');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

/* Return promise handler to transform the work object for JSON responses.
 */
var transform = function(req) {
    return function(work) {
        return respond.transformWork(
            work, req.context,
            _.pick(req.query, 'fields', 'include', 'annotations'));
    };
};

/* Return promise handler to transform array of works for JSON responses.
 */
var transformMany = function(req) {
    return function(works) {
        var promiseStack = [];
        for (var i=0; i<works.length; i++) {
            promiseStack.push(respond.transformWork(
                works[i], req.context, _.pick(req.query, 'fields', 'include')));
        }
        return Promise.all(promiseStack);
    };
};


exports.createWork = function createWork(req, res, next) {
    request.transformWork(req.body);
    core.createWork(req.context, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.getWork = function getWork(req, res, next) {
    core.getWork(req.context, req.params.workId)
        .then(transform(req))
        .then(respond.setCORSHeader(req, res))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.updateWork = function updateWork(req, res, next) {
    request.transformWork(req.body);
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

exports.listWorks = function listWorks(req, res, next) {
    core.listWorks(req.context,
                   request.convertWorkFilter(req),
                   request.convertWorkSort(req),
                   request.getSkip(req),
                   request.getLimit(req)
                  )
        .then(transformMany(req))
        .then(function(works) {
            respond.setPagingLinks(req, res, works);
            res.status(200).json(works);
        })
        .catch(function(err) {
            next(err);
        });
};
