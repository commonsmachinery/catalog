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

/*
 * Object export support: these are methods put on schemas to get
 * objects that can be safely passed to the rest of the catalog
 * without leaking information or access.  It relies on mongoose
 * toJSON with transform functions.
 */

/* Common toJSON transform function for most Schemas.
 *
 * Standard mapping:
 *  doc._id -> obj.id
 *  doc.__v -> obj.version
 *
 * If a coreContext is provided in the options, the object permissions
 * are also copied:
 *
 *  context.perms[doc.id] -> obj._perms
 */
var transformObject = function(doc, obj, options) {
    delete obj._id;
    obj.id = doc._id;

    delete obj.__v;
    if (doc.__v !== undefined) {
        obj.version = doc.__v;
    }

    if (options.context) {
        obj._perms = (options.context.perms && options.context.perms[doc.id]) || {};
    }
};

/* Return a function that can be put into a promise chain to export a
 * document, applying transformations optionally in a particular call
 * context.
 */
var objectExporter = function objectExporter(context) {
    return function(obj) {
        return obj.exportObject(context);
    };
};

/* Method to export an object, applying all transformations, optionally in a
 * particular call context.
 *
 * This is typically set as a model method.
 */
var exportObject = function exportObject(context) {
    var options = { transform: true };

    if (context) {
        options.context = context;
    }

    return this.toJSON(options);
};

/* Set the export methods on a schema. */
var setExportMethods = function(schema, transform) {
    schema.set('toJSON', { transform: transform || transformObject });
    schema.statics.objectExporter = objectExporter;
    schema.method('exportObject', exportObject);
};

//
// Data model definitions
//

// Common fields in Entry objects
var entry = {
    added_by: { type: ObjectId, required: true, ref: 'User' },
    added_at: { type: Date, default: Date.now },
    updated_by: { type: ObjectId, required: false, ref: 'User' },
    updated_at: { type: Date, required: false },
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


// If the property could be included in the schema, it would look like
// this:
/*var property = {
    propertyName: { type: 'string', required: true },
    value: { type: 'string', required: true },
    language: 'string',
    sourceFormat: 'string',
    fragmentIdentifier: 'string',
    mappingType: 'string',
};*/

var mediaAnnotationProps = {
    property: {
        type: mongo.Schema.Types.Mixed,
        required: true,
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

var MediaAnnotation = mongo.schema(mediaAnnotationProps);
setExportMethods(MediaAnnotation);

var WorkAnnotation = mongo.schema(_.extend({}, mediaAnnotationProps, {
    updated_by: {
        type: ObjectId,
        required: false,
        ref: 'User'
    },
    updated_at: {
        type: Date,
        required: false,
    },
    score: { type: Number, required: true, default: 0 },
}));
setExportMethods(WorkAnnotation);

var Source = mongo.schema({
    source_work: { type: ObjectId, required: true, ref: 'Work' },
    added_by: { type: ObjectId, ref: 'User' },
    added_at: { type: Date, default: Date.now },
});
setExportMethods(Source);

// Main schemas

var Media = mongo.schema({
    added_by: { type: ObjectId, required: true, ref: 'User' },
    added_at: { type: Date, required: true, default: Date.now },
    replaces: { type: ObjectId, ref: 'Media',
                index: {
                    sparse: true,
                }
              },
    annotations: [MediaAnnotation],
    metadata: mongo.Schema.Types.Mixed,
});
setExportMethods(Media);


var User = mongo.schema(_.extend({}, entry, {
    alias: {
        type: String,
        index: {
            unique: true,
            sparse: true,
        }
    },

    profile: profile,
}));

setExportMethods(User, function transformUser(doc, obj, options) {
    transformObject(doc, obj, options);

    if (options.context) {
        if (!options.context.userId ||
            options.context.userId.toString() !== doc.id) {
            // Only user may see the gravatar_email
            delete obj.profile.gravatar_email;
        }
    }
});


var Organisation = mongo.schema(_.extend({}, entry, {
    alias: {
        type: String,
        index: {
            unique: true,
        }
    },

    profile: profile,
    owners: [{ type: ObjectId, ref: 'User' }],
}));

setExportMethods(Organisation, function transformOrganisation(doc, obj, options) {
    transformObject(doc, obj, options);

    if (options.context) {
        if (!options.context.userId ||
            doc.owners.indexOf(options.context.userId.toString()) === -1) {
            // Only owners may see the gravatar_email
            delete obj.profile.gravatar_email;
        }
    }
});

Organisation.index('owners');


var Work = mongo.schema(_.extend({}, entry, {
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
        users: [{ type: ObjectId, ref: 'User' }],
        groups: [{ type: ObjectId, ref: 'Group' }],
    },
    annotations: [WorkAnnotation],
    sources: [Source],
    media: [{ type: ObjectId, ref: 'Media' }],
}));

setExportMethods(Work);

//Work.index({ 'owner.user': 1, 'alias': 1 }, { unique: true, sparse: true });
//Work.index({ 'owner.org': 1, 'alias': 1 }, { unique: true, sparse: true });
Work.index('alias', { unique: true, sparse: true });
Work.index('owner.user', { sparse: true });
Work.index('owner.org', { sparse: true });
Work.index('collabs.users');
Work.index('collabs.groups');
Work.index('sources.source_work');
Work.index('media');


// Core models

exports.CoreEvent = conn.model('CoreEvent', event.EventStagingSchema);
exports.User = conn.model('User', User);
exports.Media = conn.model('Media', Media);
exports.Work = conn.model('Work', Work);
exports.WorkAnnotation = conn.model('WorkAnnotation', WorkAnnotation);
exports.Source = conn.model('Source', Source);
exports.Organisation = conn.model('Organisation', Organisation);

// Connect, returning a promise that resolve when connected

exports.connect = function connect(options) {
    return mongo.openConnection(conn, config.core.db, options)
        .return(true);
};
