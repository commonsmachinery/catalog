/*
 * Catalog web/REST frontend - ETag management functions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var debug = require('debug')('catalog:frontend:etag'); // jshint ignore:line

// External libs
var util = require('util');

exports.set = function set(res, object) {
    if (object.version !== undefined) {
        res.set('ETag', util.format('W/"%s-%d"', object.id, object.version));
    }
};

exports.parse = function parse(etag) {
    var m = /^(W\/)?"(.+)-(\d+)"$/.exec(etag);

    if (!m) {
        debug('invalid object etag: %j', etag);
        return null;
    }

    return {
        id: m[2],
        version: parseInt(m[3], 10)
    };
};
