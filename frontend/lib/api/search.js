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

// Frontend libs
var respond = require('./respond');
var request = require('./request');
var uris = require('../uris');

var transformSearchResult = function(lookup, context) {
    if (lookup.object_type === 'core.Work') {
        var workId = lookup.object_id;
        var result;

        result = {
            href: uris.buildWorkURI(workId),
            uri: lookup.uri,
            text: lookup.text,
            property: lookup.property_type,
            score: lookup.score,
        };

        return result;
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

exports.lookupURI = function lookupURI(req, res, next) {
    search.lookupURI(req.query.uri,
                     req.query.context,
                     request.getSkip(req),
                     request.getLimit(req))
        .then(transformResults(req))
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.status(200).json(results);
        })
        .catch(function(err) {
            next(err);
        });
};


exports.lookupHash = function lookupURI(req, res, next) {
    search.lookupHash(req.query.hash,
                      req.query.context,
                      request.getSkip(req),
                      request.getLimit(req))
        .then(transformResults(req))
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.status(200).json(results);
        })
        .catch(function(err) {
            next(err);
        });
};
