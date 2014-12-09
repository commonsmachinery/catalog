/*
 * Catalog web/REST frontend - users API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:users'); // jshint ignore:line

// External libs

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');

/* Return promise handler to transform the work object for JSON responses.
 */
var transform = function() {
    return function(user) {
        return respond.transformUser(user);
    };
};

var updateGravatarHash = function updateGravatarHash(req){
    return function(user){
        if (req.session && req.session.userId === user.id) {
            req.session.gravatarHash = user.profile.gravatar_hash;
        }
        return user;
    };
};

exports.getUser = function getUser(req, res, next) {
    core.getUser(req.context, req.params.userId)
        .then(transform())
        .then(respond.setCORSHeader(req, res))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};


exports.updateUser = function updateUser(req, res, next) {
    request.transformUser(req.body);
    core.updateUser(req.context, req.params.userId, req.body)
        .then(updateGravatarHash(req))
        .then(transform())
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
