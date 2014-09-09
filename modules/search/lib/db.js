/* Catalog search - db schema

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:db'); // jshint ignore:line

// Common libs
var mongo = require('../../../lib/mongo');
var config = require('../../../lib/config');

// Modules
var event = require('../../event/event');

var ObjectId = mongo.Schema.Types.ObjectId;

var Lookup = mongo.schema(
    {
        text: 'string',
        uri: 'string',
        object_type: 'string',
        object_id: ObjectId,
        property_type: 'string',
        property_id: ObjectId,
        score: Number,
    }
);

Lookup.index('text', { sparse: true });
Lookup.index('uri', { sparse: true });
Lookup.index({ 'object_id': 1, 'property_id': 1 }); // TODO: unique?


// Define the search model
var conn = mongo.connection();
exports.Lookup = conn.model('Lookup', Lookup);
exports.SearchEvent = conn.model('SearchEvent', event.EventStagingSchema);

// Connect, returning a promise that resolve when connected

exports.connect = function connect() {
    return mongo.openConnection(conn, config.search.db).return(true);
};
