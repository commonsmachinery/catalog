/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:db'); // jshint ignore:line

// External modules
var _ = require('underscore');

// Common modules
var config = require('../../../lib/config');
var mongo = require('../../../lib/mongo');

var ObjectId = mongo.Schema.Types.ObjectId;

// We need a connection, but not necessarily an open one, to
// define the models
var conn = mongo.connection();

// Common fields in Entry objects
var EntrySchema = {
    added_by: { type: ObjectId, required: true, ref: 'User' },
    added_at: { type: Date, default: Date.now },
    updated_by: { type: ObjectId, required: true, ref: 'User' },
    updated_at: { type: Date, default: Date.now },
};


// Subdocuments

var profile = {
    name: 'string',
    email: 'string',
    location: 'string',
    website: 'string',
    gravatar_email: 'string',
    gravatar_hash: { type: 'string', required: true },
};


// Core models

exports.User = conn.model(
    'User',
    new mongo.Schema(
        _.extend(EntrySchema, {
            alias: {
                type: String,
                index: {
                    unique: true,
                    sparse: true,
                }
            },

            profile: profile,
        }),

        // Options
        {
            autoIndex: config.autoIndex,
        }
    )
);


// Connect, returning a promise that resolve when connected

exports.connect = function connect() {
    return mongo.openConnection(conn, config.core.db).return(true);
};
