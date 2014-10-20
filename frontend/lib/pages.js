/*
 * Catalog web/REST frontend - web app pages
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:pages'); // jshint ignore:line

// External libs
var Promise = require('bluebird');

// Components
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');

// Frontend libs
var request = require('./api/request');
var respond = require('./api/respond');


/** Only set ETag and LastModified in production, as this otherwise
 * makes developing views etc very frustrating.
 */
var setObjectHeaders = function(res, obj) {
    if (process.env.NODE_ENV === 'production') {
        respond.setObjectHeaders(res, obj);
    }
};

exports.work = function(req, res, next) {
    core.getWork(req.context, req.params.workId)
        .then(function(work) {
            // Populate useful fields and get
            // annotations sorted for us
            return respond.transformWork(
                work, req.context, {
                    include: ['owner'],
                    annotations: 'all',
                });
        })
        .then(function(work) {
            // Try to figure out a thumbnail image.  For now, just
            // look for a media with a urn:blockhash identifier and a
            // locator, since that's what the commonshasher spits out.

            // TODO: this is the kind of stuff that the view module
            // should do for us, and remember the results.

            return Promise.map(work.media, function(m) {
                return core.getWorkMedia(req.context, work.id, m.id);
            })
                .reduce(function(prevLocator, m) {
                    if (prevLocator) {
                        return prevLocator;
                    }

                    var hasBlockhash = false;
                    var locator = null;

                    for (var i = 0; i < m.annotations.length; i++) {
                        var p = m.annotations[i].property;
                        switch (p.propertyName) {
                        case 'identifier':
                            if (/^urn:blockhash:/.test(p.value)) {
                                hasBlockhash = true;
                            }
                            break;

                        case 'locator':
                            locator = p.value;
                            break;
                        }
                    }

                    return hasBlockhash ? locator : null;
                }, null)
                .then(function(locator) {
                    setObjectHeaders(res, work);
                    res.locals.work = work;

                    debug('work image src: %s', locator);
                    if (locator) {
                        res.locals.imageSrc = locator;
                    }

                    res.render('work');
                });
        })
        .catch(function(err) {
            next(err);
        });
};


exports.lookupURI = function(req, res, next) {
    if (!req.query.uri) {
        // Just render the page as-is, since it could have a search field
        res.locals.results = [];
        return res.render('lookupURI');
    }

    search.lookupURI(req.query.uri,
                     req.query.context,
                     request.getSkip(req),
                     request.getLimit(req))
        .map(exports.transformSearchResult)
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.locals.results = [];
            res.render('lookupURI');
        })
        .catch(function(err) {
            next(err);
        });
};


exports.lookupBlockhash = function(req, res, next) {
    if (!req.query.hash) {
        // Just render the page as-is, since it could have a search field
        res.locals.results = [];
        return res.render('lookupBlockhash');
    }

    search.lookupHash(req.query.uri,
                     req.query.context,
                     request.getSkip(req),
                     request.getLimit(req))
        .map(exports.transformSearchResult)
        .then(function(results) {
            respond.setPagingLinks(req, res, results);
            res.locals.results = [];
            res.render('lookupBlockhash');
        })
        .catch(function(err) {
            next(err);
        });
};
