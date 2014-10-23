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

// Catalog libs
var command = require('../../lib/command');

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
    res.locals.page = req.query.page;
    res.locals.per_page = req.query.per_page;

    if (!req.query.uri) {
        // Just render the page as-is, since it could have a search field
        res.locals.uri = null;
        res.locals.results = [];
        return res.render('lookupURI');
    }

    search.lookupURI(req.query.uri,
                     req.query.context,
                     request.getSkip(req),
                     request.getLimit(req))
        .map(function(result) {
            // Return results with work title.  More annotations could
            // be added here.
            if (result.object_type === 'core.Work') {
                return core.getWork(req.context, result.object_id)
                    .then(function(work) {
                        return respond.transformWork(
                            work, req.context, {
                                fields: 'annotations',
                                annotations: 'all',
                            });
                    })
                    .then(function(work) {
                        return {
                            property: result.property_type,
                            score: result.score,
                            work: work
                        };
                    })
                    .catch(function (err) {
                        if (err instanceof core.WorkNotFoundError ||
                            err instanceof command.PermissionError) {
                            debug('error looking up work by URI: %s', err);
                        }
                        else {
                            throw err;
                        }
                    });
            }
        })
        .then(function(results) {
            res.locals.links = respond.setPagingLinks(req, res, results);

            res.locals.uri = req.query.uri;
            res.locals.results = results.filter(function(v) { return !!v; });

            res.render('lookupURI');
        })
        .catch(function(err) {
            next(err);
        });
};


exports.lookupBlockhash = function(req, res, next) {
    res.locals.page = req.query.page;
    res.locals.per_page = req.query.per_page;

    if (!req.query.hash) {
        // Just render the page as-is, since it could have a search field
        res.locals.hash = null;
        res.locals.results = [];
        return res.render('lookupBlockhash');
    }

    search.lookupHash(req.query.hash,
                     req.query.context,
                     request.getSkip(req),
                     request.getLimit(req))
        .map(function(result) {
            // Return results with work title.  More annotations could
            // be added here.
            if (result.object_type === 'core.Work') {
                return core.getWork(req.context, result.object_id)
                    .then(function(work) {
                        return respond.transformWork(
                            work, req.context, {
                                annotations: 'all',
                            });
                    })
                    .then(function(work) {
                        return {
                            property: result.property_type,
                            distance: result.distance,
                            score: result.score,
                            work: work
                        };
                    })
                    .catch(function (err) {
                        if (err instanceof core.WorkNotFoundError ||
                            err instanceof command.PermissionError) {
                            debug('error looking up work by URI: %s', err);
                        }
                        else {
                            throw err;
                        }
                    });
            }
        })
        .then(function(results) {
            res.locals.links = respond.setPagingLinks(req, res, results);

            res.locals.hash = req.query.hash;
            res.locals.results = results.filter(function(v) { return !!v; });

            res.render('lookupBlockhash');
        })
        .catch(search.BadHashError, function() {
            res.locals.hash = req.query.hash;
            res.locals.error = 'Invalid image blockhash';

            res.render('lookupBlockhash');
        })
        .catch(function(err) {
            next(err);
        });
};
