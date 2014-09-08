/* Catalog event - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event:process'); // jshint ignore:line

// Event modules
var db = require('./db');

exports.getEventStream = function getEventStream(date, name) {
    return db.EventBatch.find({
        'date': { $gte: date },
        'events': { $elemMatch: {'event': name}},
    }).stream();
};
