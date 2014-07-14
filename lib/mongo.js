/* Catalog: MongoDB/Mongoose wrapper

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:lib:mongo'); // jshint ignore:line
var url = require('url');
var mongoose = require('mongoose');
var Promise = require('bluebird');

var config = require('./config');

// Since we use Model for all access, promisify it
Promise.promisifyAll(mongoose.Model);

exports.Model = mongoose.Model;
exports.Schema = mongoose.Schema;
exports.MongooseError = mongoose.MongooseError;

/* Wrapper function for creating new Schemas, ensuring
 * that autoIndex (and other options) are set correctly.
 */
exports.schema = function schema(def, opts) {
    var s = new mongoose.Schema(def, opts);
    s.set('autoIndex', config.autoIndex);
    return s;
};


var connection = exports.connection = function() {
    return new mongoose.Connection(mongoose);
};


// Keep track of connection open states.
// mongoose.Connection#readyState is not quite the same, as it doesn't
// take into account initialising all collections too like the open
// callback and event does.
var connsInProgress = [];
var openConns = [];
var failedConns = [];

/** Open a connection created with `connection`.
 *
 * This is safe to call multiple times on a connection.
 *
 * Return:
 *   A promise that resolves to the opened connection.
 */
var openConnection = exports.openConnection = function(conn, mongodbURL) {
    var u = url.parse(mongodbURL);
    if (!u.protocol) {
        // Plain database name, so add it to the default connection
        u = url.parse(config.mongodbURL);
        u.pathname = mongodbURL;
        mongodbURL = url.format(u);
    }

    // First see if it is already open
    var i;
    for (i = 0; i < openConns.length; i++) {
        if (openConns[i] === conn) {
            debug('Already connected to %s', u.pathname);
            return Promise.resolve(conn);
        }
    }

    // Or already failed
    for (i = 0; i < failedConns.length; i++) {
        if (failedConns[i] === conn) {
            debug('Connected to %s already failed', u.pathname);
            return Promise.reject('connection failed to ' + u.pathname);
        }
    }

    // Perhaps connection is in progress
    var inProgress = false;
    for (i = 0; i < connsInProgress.length; i++) {
        if (connsInProgress[i] === conn) {
            inProgress = true;
            break;
        }
    }

    if (inProgress) {
        debug('Connection in progress to %s', u.pathname);

        return new Promise(function(resolve, reject) {
            var onOpen, onError;

            onOpen = function() {
                conn.removeListener('error', onError);
                resolve(conn);
            };

            onError = function(err) {
                conn.removeListener('open', onOpen);
                    reject(err);
            };

            conn.on('open', onOpen)
                .on('error', onError);
        });
    }

    // Nope, so kick off connection
    connsInProgress.push(conn);

    // Strip auth part from url for loggging
    u.auth = null;
    var safeURL = url.format(u);
    console.log('Connecting to %s at: %s', u.pathname, safeURL);

    return new Promise(function(resolve, reject) {
        conn.open(mongodbURL, function(err) {
            if (err) {
                console.error('Error connecting to %s: %s', u.pathname, err);
                failedConns.push(conn);
                reject(err);
                return;
            }

            console.log('Connected to %s', u.pathname);
            openConns.push(conn);
            resolve(conn);
        });
    });
};

exports.createConnection = function(mongodbURL) {
    return openConnection(connection(), mongodbURL);
};
