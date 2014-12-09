/*
 * Catalog web/REST frontend - Sources API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:sources'); // jshint ignore:line

// External libs
var _ = require('underscore');
var Promise = require('bluebird');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

/* Return promise handler to transform the source object for JSON responses.
 */
var transform = function(req) {
    return function(source) {
        return respond.transformSource(
            req.params.workId, source, req.context,
            _.pick(req.query, 'fields', 'include'));
    };
};

/* Return promise handler to transform a list of source objects for JSON responses.
 */
var transformMany = function(req) {
    return function(sources) {
        var promiseStack = [];
        for (var i=0; i<sources.length; i++) {
            promiseStack.push(respond.transformSource(
                req.params.workId, sources[i], req.context,
                _.pick(req.query, 'fields', 'include')));
        }
        return Promise.all(promiseStack);
    };
};

exports.getWorkSource = function getWorkSource(req, res, next) {
    core.getWorkSource(req.context, req.params.workId, req.params.sourceId)
        .then(transform(req))
        .then(respond.setCORSHeader(req, res))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.getAllSources = function getAllSources(req, res, next) {
    core.getAllSources(req.context, req.params.workId)
        .then(transformMany(req))
        .then(respond.setCORSHeader(req, res))
        .then(function(sources) {
            return res.status(200).json(sources);
        })
        .catch(function(err) {
            next(err);
        });
};


exports.createWorkSource = function createWorkSource(req, res, next) {
    request.transformSource(req.body);
    core.createWorkSource(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.removeWorkSource = function removeWorkSource(req, res, next) {
    core.removeWorkSource(req.context, req.params.workId, req.params.sourceId)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.removeAllSources = function removeAllSources(req, res, next) {
    core.removeAllSources(req.context, req.params.workId)
        .then(transformMany(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
