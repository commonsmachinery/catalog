/*
 * Catalog web/REST frontend - works API
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:api:works'); // jshint ignore:line

// External libs
var url = require('url');
var _ = require('underscore');
var Promise = require('bluebird');

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('./respond');
var request = require('./request');
var uris = require('../uris');

/* Return promise handler to transform the work object for JSON responses.
 */
var transform = function(req) {
    return function(work) {
        return respond.transformWork(
            work, req.context,
            _.pick(req.query, 'fields', 'include', 'annotations'));
    };
};

/* Return promise handler to transform array of works for JSON responses.
 */
var transformMany = function(req) {
    return function(works) {
        var promiseStack = [];
        for (var i=0; i<works.length; i++) {
            promiseStack.push(respond.transformWork(
                works[i], req.context, _.pick(req.query, 'fields', 'include')));
        }
        return Promise.all(promiseStack);
    };
};

/* Convert filter query parameter to mongodb search conditions.
 */
var convertFilter = function(req) {
    var conditions = {};
    if (!req.query.filter) {
        return conditions;
    }

    var filterFields = req.query.filter.split(',');

    for (var i=0; i<filterFields.length; i++) {
        var filterField = filterFields[i].split(':');
        if (filterField.length !== 2) {
            throw new Error('Invalid filter parameter');
        }

        var key = filterField[0];
        var value = filterField[1];

        if (key === 'owner.user' ||
            key === 'owner.org' ||
            key === 'collabs.users' ||
            key === 'collabs.groups' ||
            key === 'sources.source_work' ||
            key === 'forked_from' ||
            key === 'media') {
            conditions[key] = value;
        }
    }

    return conditions;
};

/* Convert sort query parameter to mongodb sort option.
 */
var convertSort = function(req) {
    var sort = {};
    var sortKey;
    var sortValue;

    if (!req.query.sort) {
        return sort;
    }

    if (req.query.sort[0] === '-') {
        sortKey = req.query.sort.slice(1);
        sortValue = -1;

    } else {
        sortKey = req.query.sort;
        sortValue = 1;
    }

    if (sortKey === 'added_at' ||
        sortKey === 'updated_at') {
        sort[sortKey] = sortValue;
    }

    return sort;
};

/* Calculate number of skipped records from query parameters.
 */
var getSkip = function(req) {
    return req.query.per_page * (req.query.page - 1);
};

/* Calculate limit of records from query parameters.
 */
var getLimit = function(req) {
    return req.query.per_page;
};

/* Get paging links according for a list of works according to RFC 5005.
 */
var getPagingLinks = function(req, morePages) {
    var linkUrl = url.parse(req.url, true);
    var linkMap = {};

    delete linkUrl.search;
    linkUrl.query.per_page = req.query.per_page;

    linkUrl.query.page = 1;
    linkMap.first = url.format(linkUrl);

    if (morePages) {
        linkUrl.query.page = req.query.page + 1;
        linkMap.next = url.format(linkUrl);
    }

    if (req.query.page > 1) {
        linkUrl.query.page = req.query.page - 1;
        linkMap.previous = url.format(linkUrl);
    }

    return linkMap;
};

exports.createWork = function createWork(req, res, next) {
    request.transformWork(req.body);
    core.createWork(req.context, req.body)
        .then(transform(req))
        .then(respond.asJSON(res, { status: 201 }))
        .catch(function(err) {
            next(err);
        });
};

exports.getWork = function getWork(req, res, next) {
    var htmlResponse = function() {
        core.getWork(req.context, req.params.workId)
            .then(function(work) {
                // Populate useful fields
                return respond.transformWork(
                    work, req.context, {
                        include: ['owner', 'added_by', 'updated_by']
                    });
            })
            .then(function(work) {
                respond.setObjectHeaders(res, work);
                res.locals.work = work;
                res.render('workPermalink');
            })
            .catch(function(err) {
                next(err);
            });
    };

    var jsonResponse = function() {
        core.getWork(req.context, req.params.workId)
            .then(transform(req))
            .then(respond.asJSON(res))
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        html: htmlResponse,
        default: htmlResponse,
        json: jsonResponse,
    });
};

exports.updateWork = function updateWork(req, res, next) {
    request.transformWork(req.body);
    core.updateWork(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.deleteWork = function deleteWork(req, res, next) {
    core.deleteWork(req.context, req.params.workId, req.body)
        .then(transform(req))
        .then(respond.asJSON(res))
        .catch(function(err) {
            next(err);
        });
};

exports.listWorks = function listWorks(req, res, next) {
    var htmlResponse = function() {
        core.listWorks(req.context,
                convertFilter(req),
                convertSort(req),
                getSkip(req),
                getLimit(req)
            )
            .then(transformMany(req))
            .then(function(works) {
                // If no works are found, there's no next page.  Ideally we'd
                // detect this already on the last actual page, but that can
                // be improved later (and preferably then also getting a last
                // page link)
                var linkMap = getPagingLinks(req, works.length > 0);
                uris.setLinks(res, linkMap);
                res.locals.pagination = linkMap;
                res.locals.works = works;

                res.render('listWorks');
            })
            .catch(function(err) {
                next(err);
            });

    };

    var jsonResponse = function() {
        core.listWorks(req.context,
                convertFilter(req),
                convertSort(req),
                getSkip(req),
                getLimit(req)
            )
            .then(transformMany(req))
            .then(function(works) {
                uris.setLinks(res, getPagingLinks(req, works.length > 0));
                res.json(200, works);
            })
            .catch(function(err) {
                next(err);
            });
    };

    res.format({
        html: htmlResponse,
        default: htmlResponse,
        json: jsonResponse,
    });
};
