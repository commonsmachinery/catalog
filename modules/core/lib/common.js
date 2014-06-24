/* Catalog core - User object manipulation

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:user'); // jshint ignore:line

// Exernal libs
var util = require('util');


/* Base class for FooNotFound errors
 */
var NotFoundError = exports.NotFoundError = function NotFoundError(type, id) {
    this.objectType = type;
    this.objectId = id;
    Error.call(this, util.format('%s not found: %s', type, id));
};

NotFoundError.prototype = Object.create(Error.prototype);
NotFoundError.prototype.constructor = NotFoundError;

/* Check that ID is a valid ObjectId, throwing the provided exception
 * (which should inherit from NotFoundError) if not.
 */
exports.checkId = function checkId(id, ErrClass) {
    if (! /^[0-9a-fA-F]{24}$/.test(id.toString())) {
        debug('invalid ObjectId: %s', id);
        throw new ErrClass(id);
    }
};
