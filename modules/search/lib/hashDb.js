/* Catalog search - hash database connection module

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:hash'); // jshint ignore:line

// Common libs
var config = require('../../../lib/config');

// External libs
var Promise = require('bluebird');
var hmsearch = Promise.promisifyAll(require('hmsearch'));

var db = null;

exports.getDb = function () {
    return db;
};

// Connect, returning a promise that resolve when connected
exports.connect = function connect() {
    return hmsearch.openAsync(config.search.hashDb, hmsearch.READONLY)
        .then(function(tempDb) {
            db = Promise.promisifyAll(tempDb);
            return true;
        })
        .catch(function(err) {
            console.error('error opening hash database: %s', err);
            return Promise.reject(err);
        });
};
