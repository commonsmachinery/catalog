/*
 * Catalog web/REST frontend - web app support
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

// var debug = require('debug')('frontend:webapp');

var gravatar = require('./gravatar');

/* Globals */
// var isDev = process.env.NODE_ENV === 'development';


exports.init = function init(app) {
    app.locals.gravatarEmailURL = gravatar.emailURL;
    app.locals.gravatarHashURL = gravatar.hashURL;
};

exports.routes = function routes(app) {
    app.get('/', function(req, res) {
        res.render('home');
    });
    app.get('/createWork', function(req, res) {
        res.render('createWork');
    });
};
