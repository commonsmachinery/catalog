/* Catalog event - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event'); // jshint ignore:line

// For now, there's just the EventBatch schema definition.

// Common libs
var mongo = require('../../lib/mongo');


var ObjectId = mongo.Schema.Types.ObjectId;

/* EventBatch schema, common to all event emitting
 * modules.  They should instantiate their own Models
 * using this schema.
 */

var Event = mongo.schema(
    {
        type: { type: String, required: true },
        param: mongo.Schema.Types.Mixed,
    }
);

exports.EventBatchSchema = mongo.schema({
    user:    { type: ObjectId },
    date:    { type: Date, required: true, default: Date.now },
    type:    { type: String, required: true },
    object:  { type: ObjectId, required: true },
    version: { type: Number, required: true },
    events:  { type: [Event], required: true }
});

exports.EventBatchSchema.index({ user: 1, date: -1 }, { sparse: true });
exports.EventBatchSchema.index({ object: 1, date: -1 });
