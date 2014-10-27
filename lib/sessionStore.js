/* Catalog: MongoDB session store for web apps

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:sessionStore'); // jshint ignore:line

var expressSession = require('express-session');
var MongoStore = require('connect-mongo')(expressSession);

var mongo = require('./mongo');

module.exports = function(sessionDB) {
    return mongo.createConnection(sessionDB)
        .then(function(conn) {
            return new MongoStore({db: conn.db});
        });
};
