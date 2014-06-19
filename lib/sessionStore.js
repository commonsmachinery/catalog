/* Catalog: MongoDB session store for web apps

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:sessionStore');
var sessionStore = require('sessionstore');
var Promise = require('bluebird');
var url = require('url');
var config = require('./config');

module.exports = function(sessionDB) {
    function promise (resolve, reject) {
        var u, username, password, f;

        u = url.parse(sessionDB);

        if (!u.protocol) {
            // then it's just a plain database name, so rely on the
            // default connection
            u = url.parse(config.mongodbURL);
            u.pathname = sessionDB;
        }
        else {
            sessionDB = u.pathname.slice(1);
        }

        if (u.auth) {
            f = u.auth.split(':', 2);
            username = f[0];
            password = f.length > 1 ? f[1] : null;
        }

        // Strip auth so we can log what we connect to
        u.auth = null;
        console.log('connecting to session DB at: %s', url.format(u));

        sessionStore.createSessionStore({
            type: 'mongodb',
            dbName: sessionDB,
            host: u.hostname || 'localhost',
            port: u.port || 27017,
            username: username,
            password: password,
        }, function (err, store) {
            if (err) {
                reject(err);
                return;
            }

            debug('session store connected');
            resolve(store);
        });
    }

    return new Promise(promise);
};
