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


var db = require('./lib/db');

exports.init = function() {
    return db.connect();
};

//
// User
//

var user = require('./lib/user');
var media = require('./lib/media');

exports.UserNotFoundError = user.UserNotFoundError;
exports.get_user = user.get_user;
exports.create_user = user.create_user;
exports.update_user = user.update_user;

exports.MediaNotFoundError = user.MediaNotFoundError;
exports.getMedia = media.getMedia;
exports.createMedia = media.createMedia;
