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

// Components
var core = require('../../../modules/core/core.js');

// Frontend libs
var uris = require('../uris.js');
var etag = require('../etag.js');

exports.createWork = function createWork(req, res, next) {
    core.createWork(req.context, req.body)
        .then(function(work) {
            res.redirect(uris.buildWorkURI(work.id));
        })
        .catch(function(err) {
            next(err);
        });
};

exports.getWork = function getWork(req, res, next) {
    core.getWork(req.context, req.params.workId)
        .then(function(work) {
            etag.set(res, work);
            uris.setLinks(res, { self: uris.buildWorkURI(work.id) });

            res.format({
                html: function() {
                    // TODO: work view
                    throw new Error("Work view not implemented!");
                },

                json: function() {
                    res.json(work);
                }
            });
        })
        .catch(function(err) {
            next(err);
        });
};

exports.updateWork = function updateWork(req, res, next) {
    core.updateWork(req.context, req.params.workId, req.body)
        .then(function(work) {
            etag.set(res, work);
            uris.setLinks(res, { self: uris.buildWorkURI(work.id) });

            res.json(work);
        })
        .catch(function(err) {
            next(err);
        });
};

exports.deleteWork = function deleteWork(req, res, next) {
    core.deleteWork(req.context, req.params.workId, req.body)
        .then(function(work) {
            res.json(work);
        })
        .catch(function(err) {
            next(err);
        });
};
