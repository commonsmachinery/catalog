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

exports.Schema = mongoose.Schema;
exports.Model = mongoose.Model;


var connection = exports.connection = function() {
    return new mongoose.Connection(mongoose);
};

var openConnection = exports.openConnection = function(conn, mongodbURL) {
    return new Promise(function(resolve, reject) {
        var u = url.parse(mongodbURL);

        if (!u.protocol) {
            // Plain database name, so add it to the default connection
            u = url.parse(config.mongodbURL);
            u.pathname = mongodbURL;
            mongodbURL = url.format(u);
        }

        conn.open(mongodbURL);

        // Strip auth part from url for loggging
        u.auth = null;
        mongodbURL = url.format(u);

        console.log('Connecting to %s at: %s', u.pathname, mongodbURL);

        var onOpen, onError;

        onOpen = function() {
            console.log('Connected to %s', u.pathname);
            conn.removeListener('error', onError);
            resolve(conn);
        };

        onError = function(err) {
            console.error('Error connecting to %s: %s', u.pathname, err);
            conn.removeListener('open', onOpen);
            reject(err);
        };

        conn.once('open', onOpen)
            .once('error', onError);
    });
};

exports.createConnection = function(mongodbURL) {
    return openConnection(connection(), mongodbURL);
};
