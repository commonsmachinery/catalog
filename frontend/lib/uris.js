/* Catalog web/REST frontend - REST URI interface

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

// External libs
var util = require('util');

// Common libs
var config = require('../../lib/config');

function buildURI() {
    return config.frontend.baseURL + '/' + Array.prototype.join.call(arguments, '/');
}
exports.buildURI = buildURI;

function buildUserURI(userID) {
    return buildURI('users', userID);
}
exports.buildUserURI = buildUserURI;

function buildOrganisationURI(orgID) {
    return buildURI('org', orgID);
}
exports.buildOrganisationURI = buildOrganisationURI;

function buildWorkURI(workID) {
    return buildURI('works', workID);
}
exports.buildWorkURI = buildWorkURI;

function buildWorkSourceURI(workID, sourceID) {
    return buildURI('works', workID, 'sources', sourceID);
}
exports.buildWorkSourceURI = buildWorkSourceURI;

function buildWorkMediaURI(workID, mediaID) {
    return buildURI('works', workID, 'media', mediaID);
}
exports.buildWorkMediaURI = buildWorkMediaURI;

function buildWorkAnnotationURI(workID, annotationID) {
    return buildURI('works', workID, 'annotations', annotationID);
}
exports.buildWorkAnnotationURI = buildWorkAnnotationURI;

function buildStockSourceURI(userID, sourceID) {
    return buildURI('users', userID, 'sources', sourceID);
}
exports.buildStockSourceURI = buildStockSourceURI;

function workURIFromReq(req) {
    if (req.params.workID) {
        return buildWorkURI(req.params.workID);
    }

    throw new Error('missing workID param');
}
exports.workURIFromReq = workURIFromReq;

function workSourceURIFromReq(req) {
    if (req.params.workID && req.params.sourceID) {
        return buildWorkSourceURI(req.params.workID, req.params.sourceID);
    }

    throw new Error('missing workID or sourceID param');
}
exports.workSourceURIFromReq = workSourceURIFromReq;

function workMediaURIFromReq(req) {
    if (req.params.workID && req.params.mediaID) {
        return buildWorkMediaURI(req.params.workID, req.params.mediaID);
    }

    throw new Error('missing workID or mediaID param');
}
exports.workMediaURIFromReq = workMediaURIFromReq;

function stockSourceURIFromReq(req) {
    // Ugly, but this should anyway be changed into collections
    if (req.params.sourceID) {
        return buildStockSourceURI(req.session.uid, req.params.sourceID);
    }

    throw new Error('missing sourceID param');
}
exports.stockSourceURIFromReq = stockSourceURIFromReq;


/* Set the Link header in a response object from a map of
 * { rel: URI } pairs.
 *
 * This should only be called for URIs generated from controlled data,
 * preferably only the functions above.
 */
exports.setLinks = function setLinks(res, linkMap) {
    var links = [];
    var rel;

    for (rel in linkMap) {
        if (linkMap.hasOwnProperty(rel)) {
            links.push(util.format('<%s>;rel="%s"', linkMap[rel], rel));
        }
    }

    res.set('Link', links.join(', '));
};
