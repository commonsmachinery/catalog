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

// Components
var search = require('../../../modules/search/search');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

exports.lookupURI = function lookupURI(req, res, next) {
    search.lookupURI(req.query.uri,
                     {
                         context: req.query.context,
                         skip: request.getSkip(req),
                         limit: request.getLimit(req),
                     })
        .map(respond.transformSearchResult)
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.status(200).json(results);
        })
        .catch(function(err) {
            next(err);
        });
};


exports.lookupHash = function lookupHash(req, res, next) {
    search.lookupHash(req.query.hash,
                      {
                          context: req.query.context,
                          skip: request.getSkip(req),
                          limit: request.getLimit(req),
                      })
        .map(respond.transformSearchResult)
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.status(200).json(results);
        })
        .catch(search.BadHashError, function() {
            res.status(400).json({
                code: 'bad_hash',
                message: 'Bad hash format',
            });
        })
        .catch(function(err) {
            next(err);
        });
};
