/* Catalog core - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:user'); // jshint ignore:line

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

exports.UserNotFoundError = user.UserNotFoundError;
exports.get_user = user.get_user;
exports.create_user = user.create_user;
