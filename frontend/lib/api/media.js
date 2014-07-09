/*
 * Catalog web/REST frontend - Media API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:media'); // jshint ignore:line

// External libs
var _ = require('underscore');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');

/* Return promise handler to transform the media object for JSON responses.
 */
var transform = function(req) {
    return function(media) {
        return respond.transformMedia(
            req.params.workId, media, req.context,
            _.pick(req.query, 'fields', 'include'));
    };
};

exports.createWorkMedia = function createWorkMedia(req, res, next) {
    core.createWorkMedia(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.getWorkMedia = function getWorkMedia(req, res, next) {
    var htmlResponse = function() {
        core.getWorkMedia(req.context, req.params.workId, req.params.mediaId)
            .then(transform(req))
            .then(function(media) {
                respond.setObjectHeaders(res, media);

                // TODO: render work view
                throw new Error("Media view not implemented!");
            })
            .catch(function(err) {
                next(err);
            });
    };

    var jsonResponse = function() {
        core.getWorkMedia(req.context, req.params.workId, req.params.mediaId)
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

exports.deleteWorkMedia = function deleteWorkMedia(req, res, next) {
    core.deleteWorkMedia(req.context, req.params.workId, req.params.mediaId)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
