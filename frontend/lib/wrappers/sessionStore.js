'use strict';

var debug = require('debug')('frontend:sessionStore');
var sessionStore = require('sessionstore');
var Promise = require('bluebird');
var url = require('url');

module.exports = function() {
    function promise (resolve, reject) {
        var u = url.parse(process.env.CATALOG_MONGODB_URL);
        var username, password, f;

        if (u.auth) {
            f = u.auth.split(':', 2);
            username = f[0];
            password = f.length > 1 ? f[1] : null;
        }

        sessionStore.createSessionStore({
            type: 'mongodb',
            dbName: process.env.CATALOG_USERS_DB,
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
