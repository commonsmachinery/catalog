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
var uris = require('../uris');

var respond = require('./respond');
var request = require('./request');


/* Return promise handler to transform the work object for JSON responses.
 */
var transform = function() {
    return function(user) {
        return respond.transformUser(user);
    };
};


exports.getCurrentUser = function getCurrentUser(req, res) {
    if (req.context.userId) {
        res.redirect(uris.buildUserURI(req.context.userId));
    }
    else {
        res.send(403);
    }
};


exports.getUser = function getUser(req, res, next) {
    var htmlResponse = function() {
        core.getUser(req.context, req.params.userId)
            .then(transform())
            .then(function(user) {
                respond.setObjectHeaders(res, user);
                res.locals.user = user;
                res.render('userProfile');
            })
            .catch(function(err) {
                next(err);
            });
    };

    var jsonResponse = function() {
        core.getUser(req.context, req.params.userId)
            .then(transform())
            .then(respond.asJSON(res))
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        html: htmlResponse,
        default: htmlResponse,
        json: jsonResponse
    });
};


exports.updateUser = function updateUser(req, res, next) {
    request.transformUser(req.body);
    core.updateUser(req.context, req.params.userId, req.body)
        .then(transform())
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};
