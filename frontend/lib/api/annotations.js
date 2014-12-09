/*
 * Catalog web/REST frontend - Annotations API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:annotations'); // jshint ignore:line

// External libs
var _ = require('underscore');
var Promise = require('bluebird');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

/* Return promise handler to transform the annotation object for JSON responses.
 */
var transform = function(req) {
    return function(annotation) {
        return respond.transformAnnotation(
            req.params.workId, annotation, req.context,
            _.pick(req.query, 'fields', 'include'));
    };
};

/* Return promise handler to transform a list of annotation objects for JSON responses.
 */
var transformMany = function(req) {
    return function(annotations) {
        var promiseStack = [];
        for (var i=0; i<annotations.length; i++) {
            promiseStack.push(respond.transformAnnotation(
                req.params.workId, annotations[i], req.context,
                _.pick(req.query, 'fields', 'include')));
        }
        return Promise.all(promiseStack);
    };
};

exports.getWorkAnnotation = function getWorkAnnotation(req, res, next) {
    core.getWorkAnnotation(req.context, req.params.workId, req.params.annotationId)
        .then(transform(req))
        .then(respond.setCORSHeader(req, res))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.getAllAnnotations = function getAllAnnotations(req, res, next) {
    core.getAllAnnotations(req.context, req.params.workId)
        .then(transformMany(req))
        .then(respond.setCORSHeader(req, res))
        .then(function(annotations) {
            return res.status(200).json(annotations);
        })
        .catch(function(err) {
            next(err);
        });
};


exports.createWorkAnnotation = function createWorkAnnotation(req, res, next) {
    request.transformAnnotation(req.body);
    core.createWorkAnnotation(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.updateWorkAnnotation = function updateWorkAnnotation(req, res, next) {
    request.transformAnnotation(req.body);
    core.updateWorkAnnotation(req.context, req.params.workId, req.params.annotationId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.removeWorkAnnotation = function removeWorkAnnotation(req, res, next) {
    core.removeWorkAnnotation(req.context, req.params.workId, req.params.annotationId)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.removeAllAnnotations = function removeAllAnnotations(req, res, next) {
    core.removeAllAnnotations(req.context, req.params.workId)
        .then(transformMany(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
