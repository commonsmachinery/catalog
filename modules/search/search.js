/* Catalog search - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var db = require('./lib/db');
var lookup = require('./lib/lookup');

exports.createLookup = lookup.createLookup;
exports.lookupURI = lookup.lookupURI;
exports.lookupHash = lookup.lookupHash;

exports.init = function() {
    return db.connect();
};
