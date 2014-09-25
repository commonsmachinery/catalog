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
var _ = require('underscore');

// Common libs
var gravatar = require('../../../lib/gravatar');
var command = require('../../../lib/command');

// Modules
var core = require('../../../modules/core/core');

// Frontend libs
var request = require('../../lib/api/request');

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
    app.locals.gravatarEmailURL = gravatar.emailURL;
    app.locals.gravatarHashURL = gravatar.hashURL;
    app.locals.bootstrapData = bootstrapData;
    app.locals._ = _;
};


/* Handle GET core errors in a web API kind of way
 */
var handleCoreErrors = function(err, req, res, next) {
    // TODO: render proper error pages

    if (err instanceof command.PermissionError) {
        res.status(403).end(); // forbidden
    }
    else if (err instanceof core.NotFoundError) {
        res.status(404).end(); // not found
    }
    else {
        // Hand it on to next error handler
        next(err);
    }
};


var router = exports.router = express.Router();

router.get('/', function(req, res) {
    res.render('home');
});


router.get('/users/:userId',
           request.setContext, pages.user, handleCoreErrors);

router.get('/works',
           request.setContext, request.validatePaging,
           pages.browseWorks,
           handleCoreErrors);

// Synonyms for work, but will have in-page routing
router.get('/works/:workId',
           request.setContext, pages.work, handleCoreErrors);
router.get('/works/:workId/annotations',
           request.setContext, pages.work, handleCoreErrors);
router.get('/works/:workId/annotations/:annotationId',
           request.setContext, pages.work, handleCoreErrors);
router.get('/works/:workId/sources',
           request.setContext, pages.work, handleCoreErrors);
router.get('/works/:workId/sources/:sourceId',
           request.setContext, pages.work, handleCoreErrors);
router.get('/works/:workId/media',
           request.setContext, pages.work, handleCoreErrors);

// Media has a separate page
router.get('/works/:workId/media/:mediaId',
           request.setContext, pages.media, handleCoreErrors);

