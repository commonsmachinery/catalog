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
var url = require('url');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');
var config = require('../../../lib/config');

/* Return promise handler to transform the media object for JSON responses.
 */
var transform = function(req) {
    return function(media) {
        return respond.transformMedia(
            req.params.workId, media, req.context,
            _.pick(req.query, 'fields', 'include', 'annotations'));
    };
};

exports.createWorkMedia = function createWorkMedia(req, res, next) {
    var path;
    var origWorkId;
    var origMediaId;

    request.transformMedia(req.body);

    if (req.body.hasOwnProperty('href')) {
        if ( (req.body.href.indexOf(config.frontend.baseURL) === 0) &&
             (path = url.parse(req.body.href).path.split('/')) && (path[0] === '') &&
             (path[1] === 'works') && (origWorkId = path[2]) &&
             (path[3] === 'media') && (origMediaId = path[4]) ) {
            core.addMediaToWork(req.context, req.params.workId, origWorkId, origMediaId)
                .then(transform(req))
                .then(respond.asJSON(res, { status: 201 }))
                .catch(function(err) {
                    next(err);
                });
        } else {
            res.status(400).json({ error: 'Invalid media URL' });
        }
    } else {
        core.createWorkMedia(req.context, req.params.workId, req.body)
            .then(transform(req))
            .then(respond.asJSON(res, { status: 201 }))
            .catch(function(err) {
                next(err);
            });
    }
};

exports.getWorkMedia = function getWorkMedia(req, res, next) {
    var htmlResponse = function() {
        core.getWorkMedia(req.context, req.params.workId, req.params.mediaId)
            .then(transform(req))
            .then(function(media) {
                respond.setObjectHeaders(res, media);
                res.locals.media = media;
                res.render('media');
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

exports.removeMediaFromWork = function removeMediaFromWork(req, res, next) {
    core.removeMediaFromWork(req.context, req.params.workId, req.params.mediaId)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.unlinkAllMedia = function unlinkAllMedia(req, res, next) {
    core.unlinkAllMedia(req.context, req.params.workId)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
