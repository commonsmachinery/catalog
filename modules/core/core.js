/* Catalog core - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

/* The first argument of all CRUD methods is a context object, which
 * include any of these properties:
 *
 *   userId: the ID of the user performing the request (required).  If
 *   the user is not allowed to do it, an PermissionError is raised.
 *
 *   version: the expected version of the object to be manipulated.
 *   If included and the object version is not exactly this, a
 *   ConflictError will be raised.
 *
 * TODO: this will also hold access tokens, and probably retry counts too.
 */

'use strict';

var debug = require('debug')('catalog:core'); // jshint ignore:line

// External modules

// Common modules
var command = require('../../lib/command'); // jshint ignore:line

// Core modules
var db = require('./lib/db');
var common = require('./lib/common');

exports.init = function() {
    return db.connect();
};

exports.NotFoundError = common.NotFoundError;

//
// User
//

var user = require('./lib/user');
var organisation = require('./lib/organisation');
var work = require('./lib/work');
var media = require('./lib/media');

exports.UserNotFoundError = user.UserNotFoundError;
exports.getUser = user.getUser;
exports.getUserByAlias = user.getUserByAlias;
exports.createUser = user.createUser;
exports.updateUser = user.updateUser;

exports.OrganisationNotFoundError = organisation.OrganisationNotFoundError;
exports.getOrganisation = organisation.getOrganisation;
exports.getOrgByAlias = organisation.getOrgByAlias;
exports.createOrganisation = organisation.createOrganisation;
exports.updateOrganisation = organisation.updateOrganisation;

exports.MediaNotFoundError = media.MediaNotFoundError;
exports.getMedia = media.getMedia;

exports.WorkNotFoundError = work.WorkNotFoundError;
exports.getWork = work.getWork;
exports.createWork = work.createWork;
exports.updateWork = work.updateWork;
exports.deleteWork = work.deleteWork;
exports.listWorks = work.listWorks;

exports.getWorkMedia = work.getWorkMedia;
exports.createWorkMedia = work.createWorkMedia;
exports.removeMediaFromWork = work.removeMediaFromWork;
exports.unlinkAllMedia = work.unlinkAllMedia;
exports.addMediaToWork = work.addMediaToWork;

exports.getWorkAnnotation = work.getWorkAnnotation;
exports.getAllAnnotations = work.getAllAnnotations;
exports.createWorkAnnotation = work.createWorkAnnotation;
exports.updateWorkAnnotation = work.updateWorkAnnotation;
exports.removeWorkAnnotation = work.removeWorkAnnotation;
exports.removeAllAnnotations = work.removeAllAnnotations;

exports.getWorkSource = work.getWorkSource;
exports.getAllSources = work.getAllSources;
exports.createWorkSource = work.createWorkSource;
exports.removeWorkSource = work.removeWorkSource;
exports.removeAllSources = work.removeAllSources;