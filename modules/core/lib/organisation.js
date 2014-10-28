/* Catalog core - Organisation object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:organisation'); // jshint ignore:line

// External modules
var util = require('util');
var Types = require('mongoose').Types;

// Common modules
var command = require('../../../lib/command');
var gravatar = require('../../../lib/gravatar');


// Core modules
var db = require('./db');
var common = require('./common');

/* Return a function that sets the permissions for this Organisation object in
 * the context.  It can be put in a promise chain after reading the
 * object.
 *
 * Export it so it can be unit tested.
 */
var setOrganisationPerms = exports.setOrganisationPerms = function(context) {
    return function(org) {
        if (!context.perms) {
            context.perms = {};
        }

        var perms = context.perms[org.id];
        if (!perms) {
            perms = context.perms[org.id] = {};
        }

        if (context.userId && org.owners && org.owners.indexOf(context.userId.toString()) > -1) {
            perms.read = perms.write = perms.admin = true;
        }

        return org;
    };
};


/* Error raised when a Organisation object is not found.
 */
var OrganisationNotFoundError = exports.OrganisationNotFoundError = function OrganisationNotFoundError(id) {
    this.name = "OrganisationNotFoundError";
    common.NotFoundError.call(this, 'core.Organisation', id);
    Error.captureStackTrace(this, OrganisationNotFoundError);
};

util.inherits(OrganisationNotFoundError, common.NotFoundError);


/* All command methods return { save: Organisation(), event: CoreEvent() }
 * or { remove: Organisation(), event: CoreEvent() }
 *
 * They are exported here just to aid the unit tests.
 */
var cmd = exports.command = {};


/* Get a Organisation object.
 *
 * Returns a promise that resolves to the organisation or null if not found.
 */
exports.getOrganisation = function getOrganisation(context, orgId) {
    common.checkId(orgId, OrganisationNotFoundError);

    return db.Organisation.findByIdAsync(orgId)
        .then(function(org) {
            if (!org) {
                debug('core.Organisation not found: %s', orgId);
                throw new OrganisationNotFoundError(orgId);
            }

            // this enables setting CORS header for organisations
            context.setCORS = true;

            return org;
        })
        .then(setOrganisationPerms(context))
        .then(db.Organisation.objectExporter(context));
};

/* Get a Organisation object by alias.
 *
 * Returns a promise that resolves to the organisation or null if not found.
 */
exports.getOrgByAlias = function getOrgByAlias(context, alias) {
    return db.Organisation.findAsync({ alias: alias })
        .then(function(result) {
            if (result.length === 0) {
                debug('core.Organisation not found by alias: %s', alias);
                throw new OrganisationNotFoundError(alias);
            }

            return result[0];
        })
        .then(setOrganisationPerms(context))
        .then(db.Organisation.objectExporter(context));
};

/* Create a new Organisation object from a source object with the same
 * properties.
 *
 *
 * Returns a promise that resolves to the new organisation
 */
exports.createOrganisation = function createOrganisation(context, src) {
    return command.execute(cmd.create, context, src)
        .then(setOrganisationPerms(context))
        .then(db.Organisation.objectExporter(context));
};

cmd.create = function commandCreateOrganisation(context, src) {
    var id = new Types.ObjectId();
    var dest = {
        _id: id,
        added_by: context.userId,
        updated_by: context.userId,
        profile: {},
        // add creator to owners automatically
        owners: [ context.userId ]
    };

    command.copyIfSet(src, dest, 'alias');
    command.copyIfSet(src.profile, dest.profile, 'name');
    command.copyIfSet(src.profile, dest.profile, 'email');
    command.copyIfSet(src.profile, dest.profile, 'location');
    command.copyIfSet(src.profile, dest.profile, 'website');
    command.copyIfSet(src.profile, dest.profile, 'gravatar_email');

    // Always set gravatar hash, falling back on object ID
    dest.profile.gravatar_hash = gravatar.emailHash(
        dest.profile.gravatar_email || dest._id.toString());

    var org = new db.Organisation(dest);
    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Organisation',
        object: org.id,
        events: [{
            event: 'core.org.created',
            param: { organisation: org.exportObject() },
        }],
    });

    debug('creating new organisation: %j', org.toObject());

    return { save: org, event: event };
};


/* Update a Organisation object from a source object.
 *
 * Returns a promise that resolves to the updated organisation.
 */
exports.updateOrganisation = function updateOrganisation(context, orgId, src) {
    common.checkId(orgId, OrganisationNotFoundError);

    return db.Organisation.findByIdAsync(orgId)
        .then(function(org) {
            if (!org) {
                debug('core.Organisation not found: %s', orgId);
                throw new OrganisationNotFoundError(orgId);
            }

            return org;
        })
        .then(setOrganisationPerms(context))
        .then(function(org) {
            return command.execute(cmd.update, context, org, src);
        })
        .then(db.Organisation.objectExporter(context));
};


cmd.update = function commandUpdateOrganisation(context, org, src) {
    // Check permissions set with setOrganisationPerms()
    if (!(context.perms[org.id] && context.perms[org.id].write)) {
        throw new command.PermissionError(context.orgId, org.id);
    }

    command.checkVersionConflict(context, org);

    // OK to apply update, so get a new version
    org.increment();

    var event = new db.CoreEvent({
        user: context.userId,
        type: 'core.Organisation',
        object: org.id,
        events: [],
    });

    org.updated_at = new Date();
    org.updated_by = context.orgId;

    command.updateProperty(src, org, 'alias', event, 'core.org.changed');

    if (typeof src.profile === 'object') {
        command.updateProperties(
            src.profile, org.profile,
            [ 'name', 'email', 'location', 'website' ],
            event, 'core.org.changed.profile');

        if (command.updateProperty(src.profile, org.profile, 'gravatar_email',
                                   event, 'core.org.changed.profile')) {

            // Update the gravatar hash on email changes
            org.profile.gravatar_hash = gravatar.emailHash(
                org.profile.gravatar_email || org.id);
        }
    }

    if (src.owners) {
        command.updateUserArrayProperty(src, org, 'owners', event,
            'core.org.owner.added', 'core.org.owner.removed', 'user_id');
    }

    return { save: org, event: event };
};
