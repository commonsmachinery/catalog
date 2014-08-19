/*
 * Catalog API test - users
 *
 * Copyright 2014 Commons Machinery http://commonsmachinery.se/
 *
 * Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
 */

'use strict';


// Timestamped user name for tests, to ensure that each test suite
// starts out with a blank slate
exports.testUser = 'apitest-' + Date.now();

// Standard test name when doing access tests as another user
exports.otherUser = 'another' + Date.now();


// URL regexps
exports.urlRE = {
    user: /\/users\/[0-9a-f]+$/,
    work: /\/works\/[0-9a-f]+$/,
    media: /\/works\/[0-9a-f]+\/media\/[0-9a-f]+$/,
    annotation: /\/works\/[0-9a-f]+\/annotations\/[0-9a-f]+$/,
    source: /\/works\/[0-9a-f]+\/sources\/[0-9a-f]+$/
};

exports.etagRE = /^W\/".*"$/;


/* Make a shallow clone of the object */
exports.clone = function clone(obj){
    var extend = require('util')._extend;
    return extend({}, obj);
};

/* Create Authentication header value for test logins */
exports.auth = function auth(user){
    return 'Basic ' + new Buffer(user + ':').toString('base64');
};

