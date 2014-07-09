/* Catalog event - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event'); // jshint ignore:line

// Event libs
var db = require('./lib/db');


exports.EventStagingSchema = db.EventStagingSchema;

