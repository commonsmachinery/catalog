/*
 * Catalog web/REST frontend - web app pages
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:pages'); // jshint ignore:line

// External libs

// Components
var core = require('../../../modules/core/core');

// Frontend libs
var respond = require('../../lib/api/respond');
var request = require('../../lib/api/request');


exports.user = function(req, res, next) {
    core.getUser(req.context, req.params.userId)
        .then(function(user) {
            return respond.transformUser(user);
        })
        .then(function(user) {
            respond.setObjectHeaders(res, user);
            res.locals.user = user;
            res.render('userProfile');
        })
        .catch(function(err) {
            next(err);
        });
};


exports.work = function(req, res, next) {
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


exports.browseWorks = function(req, res, next) {
    core.listWorks(req.context,
                   request.convertWorkFilter(req),
                   request.convertWorkSort(req),
                   request.getSkip(req),
                   request.getLimit(req)
                  )
        .map(function(work) {
            return respond.transformWork(
                work, req.context, {});
        })
        .then(function(works) {
            var linkMap = respond.setPagingLinks(req, res, works);
            res.locals.pagination = linkMap;
            res.locals.works = works;

            res.render('listWorks');
        })
        .catch(function(err) {
            next(err);
        });
};


exports.media = function(req, res, next) {
    core.getWorkMedia(req.context, req.params.workId, req.params.mediaId)
        .then(function(media) {
            return respond.transformMedia(
                req.params.workId, media, req.context, {});
        })
        .then(function(media) {
            respond.setObjectHeaders(res, media);
            res.locals.media = media;
            res.render('media');
        })
        .catch(function(err) {
            next(err);
        });
};
