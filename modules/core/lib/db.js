/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:db'); // jshint ignore:line

// External libs
var _ = require('underscore');

// Common libs
var config = require('../../../lib/config');
var mongo = require('../../../lib/mongo');

// Modules
var event = require('../../event/event');

var ObjectId = mongo.Schema.Types.ObjectId;

// We need a connection, but not necessarily an open one, to
// define the models
var conn = mongo.connection();

// Common fields in Entry objects
var entry = {
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

var annotation = {
    updated_by: { type: ObjectId, ref: 'User' },
    updated_at: { type: Date, default: Date.now },
    score: 'number',
    property: {
        type: mongo.Schema.Types.Mixed,
        validate: [{
            validator: function(property) {
                return property.hasOwnProperty('propertyName');
            }, msg: 'property.propertyName is required.',
        }, {
            validator: function(property) {
                return property.hasOwnProperty('value');
            }, msg: 'property.value is required.'
        }]
    },
};

// Core models

exports.CoreEvent = conn.model('CoreEvent', event.EventBatchSchema);

exports.User = conn.model(
    'User',
    mongo.schema(_.extend({}, entry, {
        alias: {
            type: String,
            index: {
                unique: true,
                sparse: true,
            }
        },

        profile: profile,
    }))
);

exports.Media = conn.model(
    'Media',
    mongo.schema({
        added_by: { type: ObjectId, required: true, ref: 'User' },
        added_at: { type: Date, default: Date.now },
        replaces: { type: ObjectId, ref: 'Media',
            index: {
                sparse: true,
            }
        },
        annotations: [annotation],
        metadata: mongo.Schema.Types.Mixed,
    })
);

exports.Work = conn.model(
    'Work',
    mongo.schema(_.extend({}, entry, {
        owner: {
            user: { type: ObjectId, ref: 'User' },
            org: { type: ObjectId, ref: 'Organisation' },
        },
        alias: String,
        description: String,
        forked_from: {
            type: ObjectId,
            ref: 'Work',
            index: {
                sparse: true,
            }
        },
        public: { type: Boolean, default: false },
        collabs: {
            users: [{ type: ObjectId, ref: 'Organisation' }],
            groups: [{ type: ObjectId, ref: 'Group' }],
        },
        annotations: [annotation],
        sources: [{
            source_work: { type: ObjectId, required: true, ref: 'Work' },
            added_by: { type: ObjectId, ref: 'User' },
            added_at: { type: Date, default: Date.now },
        }],
        media: [{ type: ObjectId, ref: 'Media' }],
    }))
);

exports.Work.schema.index({ 'owner.user': 1, 'alias': 1 }, { unique: true, sparse: true });
exports.Work.schema.index({ 'owner.org': 1, 'alias': 1 }, { unique: true, sparse: true });
exports.Work.schema.index('owner.user', { sparse: true });
exports.Work.schema.index('owner.org', { sparse: true });
exports.Work.schema.index('collabs.users');
exports.Work.schema.index('collabs.groups');
exports.Work.schema.index('sources.source_work');
exports.Work.schema.index('media');

// Connect, returning a promise that resolve when connected

exports.connect = function connect() {
    return mongo.openConnection(conn, config.core.db).return(true);
};
