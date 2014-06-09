/* Catalog web/REST frontend - REST URI interface

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';
var config = require('../../lib/config');

function buildURI() {
    return config.catalog.baseURL + '/' + Array.prototype.join.call(arguments, '/');
}
exports.buildURI = buildURI;

function buildUserURI(userID) {
    return buildURI('users', userID);
}
exports.buildUserURI = buildUserURI;

function buildWorkURI(workID) {
    return buildURI('works', workID);
}
exports.buildWorkURI = buildWorkURI;

function buildWorkSourceURI(workID, sourceID) {
    return buildURI('works', workID, 'sources', sourceID);
}
exports.buildWorkSourceURI = buildWorkSourceURI;

function buildWorkPostURI(workID, postID) {
    return buildURI('works', workID, 'posts', postID);
}
exports.buildWorkPostURI = buildWorkPostURI;

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

function workPostURIFromReq(req) {
    if (req.params.workID && req.params.postID) {
        return buildWorkPostURI(req.params.workID, req.params.postID);
    }

    throw new Error('missing workID or postID param');
}
exports.workPostURIFromReq = workPostURIFromReq;

function stockSourceURIFromReq(req) {
    // Ugly, but this should anyway be changed into collections
    if (req.params.sourceID) {
        return buildStockSourceURI(req.session.uid, req.params.sourceID);
    }

    throw new Error('missing sourceID param');
}
exports.stockSourceURIFromReq = stockSourceURIFromReq;
