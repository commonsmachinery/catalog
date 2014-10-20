/*
 * Catalog web/REST frontend - web app interface
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:webapp'); // jshint ignore:line

// External libs
var express = require('express');
var consolidate = require('consolidate');
var _ = require('underscore');

// Common libs
var command = require('../../lib/command');
var config = require('../../lib/config');

// Modules
var core = require('../../modules/core/core');

// Frontend libs
var request = require('../lib/api/request');

// Catalog frontend libs
var pages = require('./pages');


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
    // Jade templating
    app.engine('.jade', consolidate.jade);
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/../views');

    app.locals.config = config;
    app.locals.bootstrapData = bootstrapData;
    app.locals._ = _;
};


/* Set correct HTTP status for errors to render error pages in general handler
 */
var handleCoreErrors = function(err, req, res, next) {
    if (err instanceof command.PermissionError) {
        res.status(403); // forbidden
    }
    else if (err instanceof core.NotFoundError) {
        res.status(404); // not found
    }

    // Hand it on to next error handler
    next(err);
};


var router = exports.router = express.Router();

router.get('/lookup/uri',
           request.setContext, pages.lookupURI, handleCoreErrors);

router.get('/lookup/blockhash',
           request.setContext, pages.lookupBlockhash, handleCoreErrors);

router.get('/works/:workId',
           request.setContext, pages.work, handleCoreErrors);


// TODO: render errors nicely
