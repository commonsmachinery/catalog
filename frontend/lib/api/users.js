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
var core = require('../../../modules/core/core.js');

// Frontend libs
var uris = require('../uris.js');
var etag = require('../etag.js');


exports.getCurrentUser = function getCurrentUser(req, res) {
    if (req.context.userId) {
        res.redirect(uris.buildUserURI(req.context.userId));
    }
    else {
        res.send(403);
    }
};


exports.getUser = function getUser(req, res, next) {
    core.getUser(req.context, req.params.userId)
        .then(function(user) {
            etag.set(res, user);
            uris.setLinks(res, { self: uris.buildUserURI(user.id) });

            res.format({
                html: function() {
                    res.locals.user = user;
                    res.render('userProfile');
                },

                json: function() {
                    res.json(user);
                }
            });
        })
        .catch(function(err) {
            next(err);
        });
};


exports.updateUser = function updateUser(req, res, next) {
    core.updateUser(req.context, req.params.userId, req.body)
        .then(function(user) {
            etag.set(res, user);
            uris.setLinks(res, { self: uris.buildUserURI(user.id) });

            res.json(user);
        })
        .catch(function(err) {
            next(err);
        });
};
