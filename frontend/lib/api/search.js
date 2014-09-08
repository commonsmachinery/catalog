/*
 * Catalog web/REST frontend - search API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:search'); // jshint ignore:line

// External libs
var Promise = require('bluebird');

// Components
var search = require('../../../modules/search/search');
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');
var uris = require('../uris');

var transformSearchResult = function(lookup, context) {
    if (lookup.object_type === 'core.Work') {
        var workId = lookup.object_id;
        var annotationId = lookup.property_id;
        var result = {};

        result.href = uris.buildWorkURI(workId);
        result.uri = lookup.uri;
        result.text = lookup.text;
        result.property = lookup.property_type;

        return core.getWorkAnnotation(context, workId, annotationId)
            .then(function(annotation) {
                result.score = annotation.score;
                return result;
            })
            .catch(function(err) {
                console.error('Could not transform search result %s: %s', lookup.id, err);
            });
    }
    else {
        throw new Error('Unable to transform search result for %s', lookup.object_type);
    }
};

/* Return promise handler to transform search results for JSON responses.
 */
var transformResults = function(req) {
    return function(results) {
        var promiseStack = [];
        for (var i = 0; i < results.length; i++) {
            promiseStack.push(transformSearchResult(results[i], req.context));
        }
        return Promise.all(promiseStack);
    };
};

/* Convert query parameters to mongodb search conditions.
 */
var getConditions = function(req) {
    var conditions = {};

    if (typeof req.query.uri === 'string') {
        conditions = {
            uri: req.query.uri
        };
    } else {
        conditions = {
            uri: { $in: req.query.uri }
        };
    }

    return conditions;
};

exports.lookupURI = function lookupURI(req, res, next) {
    var jsonResponse = function() {
        search.lookupURI(getConditions(req),
                request.getSkip(req),
                request.getLimit(req))
            .then(transformResults(req))
            .then(function(results) {
                respond.setPagingLinks(req, res, results);
                res.json(200, results);
            })
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        default: jsonResponse,
        json: jsonResponse
    });
};

exports.lookupHash = function lookupURI(req, res, next) {
    var jsonResponse = function() {
        search.lookupHash(getConditions(req),
                request.getSkip(req),
                request.getLimit(req))
            .then(transformResults(req))
            .then(function(results) {
                respond.setPagingLinks(req, res, results);
                res.json(200, results);
            })
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        default: jsonResponse,
        json: jsonResponse
    });
};
