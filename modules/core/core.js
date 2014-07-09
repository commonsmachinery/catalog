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
var work = require('./lib/work');
var media = require('./lib/media');

exports.UserNotFoundError = user.UserNotFoundError;
exports.getUser = user.getUser;
exports.createUser = user.createUser;
exports.updateUser = user.updateUser;

exports.MediaNotFoundError = media.MediaNotFoundError;
exports.getMedia = media.getMedia;

exports.WorkNotFoundError = work.WorkNotFoundError;
exports.getWork = work.getWork;
exports.createWork = work.createWork;
exports.updateWork = work.updateWork;
exports.deleteWork = work.deleteWork;
exports.getWorkMedia = work.getWorkMedia;
exports.createWorkMedia = work.createWorkMedia;
exports.deleteWorkMedia = work.deleteWorkMedia;
exports.unlinkAllMedia = work.unlinkAllMedia;