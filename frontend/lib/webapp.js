/*
 * Catalog web/REST frontend - web app support
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

// var debug = require('debug')('frontend:webapp');

/* Globals */
// var isDev = process.env.NODE_ENV === 'development';

exports.init = function init(app) {
};

exports.routes = function routes(app) {
    app.get('/', function(req, res) {
        res.render('home');
    });
};
