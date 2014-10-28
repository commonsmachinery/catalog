/*
 * Catalog web/REST frontend - organisations API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:organisations'); // jshint ignore:line

// External libs

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

/* Return promise handler to transform the organisation object for JSON responses.
 */
var transform = function() {
    return function(org) {
        return respond.transformOrganisation(org);
    };
};

exports.getOrganisation = function getOrganisation(req, res, next) {
    core.getOrganisation(req.context, req.params.orgId)
        .then(transform())
        .then(respond.setCORSHeader(req, res))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.createOrganisation = function createOrganisation(req, res, next) {
    request.transformOrganisation(req.body);
    core.createOrganisation(req.context, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.updateOrganisation = function updateOrganisation(req, res, next) {
    request.transformOrganisation(req.body);
    core.updateOrganisation(req.context, req.params.orgId, req.body)
        .then(transform())
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
