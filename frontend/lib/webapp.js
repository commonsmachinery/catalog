/*
 * Catalog web/REST frontend - web app support
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:webapp'); // jshint ignore:line

// External libs
var express = require('express');
var _ = require('underscore');

// Common libs
var gravatar = require('../../lib/gravatar');


/* Format bootstrap data into a string that can be safely put into a script block
 *
 * Explanation here:
 * http://www.w3.org/TR/html5/scripting-1.html#restrictions-for-contents-of-script-elements
 */
var bootstrapData = function bootstrapData(data) {
    return JSON.stringify(data)
        .replace('<!--', '<\\!--')
        .replace('<script', '<\\script')
        .replace('</script', '<\\/script');
};


exports.init = function init(app) {
    app.locals.gravatarEmailURL = gravatar.emailURL;
    app.locals.gravatarHashURL = gravatar.hashURL;
    app.locals.bootstrapData = bootstrapData;
    app.locals._ = _;
};

var router = exports.router = express.Router();

router.get('/', function(req, res) {
    res.render('home');
});

