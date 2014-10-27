/* Catalog event - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event'); // jshint ignore:line

// Event libs
var db = require('./lib/db');
var subscriber = require('./lib/subscriber');
var process = require('./lib/process');

exports.EventStagingSchema = db.EventStagingSchema;
exports.Subscriber = subscriber.Subscriber;

exports.getEventStream = process.getEventStream;

exports.init = function(options) {
    return db.connect(options);
};
