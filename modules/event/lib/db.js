/* Catalog event - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event:db'); // jshint ignore:line

// Common libs
var mongo = require('../../../lib/mongo');
var config = require('../../../lib/config');

// External libs
var _ = require('underscore');

var ObjectId = mongo.Schema.Types.ObjectId;

/* Common event schema format for staging and log */
var Event = mongo.schema(
    {
        event: { type: String, required: true },
        param: mongo.Schema.Types.Mixed,
    }
);

var eventBatchProps = {
    user:    { type: ObjectId },
    date:    { type: Date, required: true, default: Date.now },
    type:    { type: String },
    object:  { type: ObjectId },
    version: { type: Number },
    events:  { type: [Event], required: true }
};


/**
 * Schema for event staging collections.
 *
 * Each module emitting events must instantiate their own Model using
 * this schema.
 */
exports.EventStagingSchema = mongo.schema(
    eventBatchProps,

    { /* options: */
        capped: {
            size: config.event.stagingSize,
            autoIndexId: false,
        },
        versionKey: false,
    }
);


/*!
 * Event log schema, with indices tuned for querying it.
 */
var EventBatch = mongo.schema(
    eventBatchProps,

    { /* options */
        collection: 'log',
    }
);

/*!
 * Short-term log for storing search events.
 */
var searchEventBatchProps = _.clone(eventBatchProps);
searchEventBatchProps.date = {
    type: Date,
    required: true,
    default: Date.now,
    expires: 3600,
};

var SearchEventBatch = mongo.schema(
    searchEventBatchProps,

    { /* options */
        collection: 'searchlog',
    }
);

EventBatch.index({ user: 1, date: -1 }, { sparse: true });
EventBatch.index({ object: 1, date: -1 });
EventBatch.index({ object: 1, version: -1 }, { sparse: true });

// Define the event log model
var conn = mongo.connection();
exports.EventBatch = conn.model('EventBatch', EventBatch);
exports.SearchEventBatch = conn.model('SearchEventBatch', SearchEventBatch);

// Connect, returning a promise that resolve when connected

exports.connect = function connect() {
    return mongo.openConnection(conn, config.event.db).return(true);
};
