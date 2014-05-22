/*
 * Catalog web/REST frontend - gravatar utility functions
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';

var crypto = require('crypto');
var querystring = require('querystring');

var hashURL = exports.hashURL = function hashURL(hash, size) {
    if (typeof size !== 'number') {
        throw new Error('invalid gravatar size: ' + size);
    }

    return '//www.gravatar.com/avatar/' +
        querystring.escape(hash) + '?' +
        querystring.stringify({
            d: 'retro',
            s: size
        });
};

var emailHash = exports.emailHash = function emailHash(email) {
    var hash = crypto.createHash('md5');
    hash.update(email.trim());
    return hash.digest('hex');
};

exports.emailURL = function emailURL(email, size) {
    return hashURL(emailHash(email), size);
};

