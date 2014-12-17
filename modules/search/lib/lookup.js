/* Catalog search - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:lookup'); // jshint ignore:line
var util = require('util');
var crypto = require('crypto');

// Search libs
var db = require('./db');
var hashDb = require('./hashDb');

// Common modules
var command = require('../../../lib/command');

// External libs
var Promise = require('bluebird');


/* BadHashError: thrown on invalid hashes.
 */
var BadHashError = exports.BadHashError = function(message) {
    this.message = message;
    this.name = "BadHashError";
    Error.captureStackTrace(this, BadHashError);
};

util.inherits(BadHashError, Error);


/* Create a new Lookup object and return a Promise
 * which resolves to the new Lookup object
 */
exports.createLookup = function createLookup(src) {
    var lookup;

    lookup = new db.Lookup(src);

    return new Promise(function(resolve, reject) {
        lookup.save(function(err, doc) {
            if (err) {
                debug('saving lookup failed: %s', err);
                reject(err);
                return;
            }

            resolve(doc);
        });
    });
};

/* Search for URI(s) in lookup database.
 *
 * Options:
 *  - context: page/post URI
 *  - skip:    skip this many records
 *  - limit:   only return this many records
 *  - nolog:   don't log missing entries
 *
 * Returns a Promise which resolves to an array of Lookup objects.
 */
exports.lookupURI = function lookupURI(uris, options) {
    var opts = options || {};
    var conditions;
    var decoded; // decoded uris
    var mangled = []; // uris with http: scheme duplicated as https and vice versa
    var hashes = []; // we actually lookup urls by md5 hashes
    var uri, extraURI, i;

    if (typeof uris === 'string') {
        decoded = [decodeURI(uris)];
    } else {
        decoded = uris.map(decodeURI);
    }

    // duplicate http URLs as https and vice versa
    // to support sites which treat these URLs identically
    for (i = 0; i < decoded.length; i++) {
        uri = decoded[i];
        if (uri.indexOf('http://') === 0) {
            extraURI = 'https://' + uri.slice(7);
            if (mangled.indexOf(extraURI) === -1) {
                mangled.push(extraURI);
            }
        }
        else if (uri.indexOf('https://') === 0) {
            extraURI = 'http://' + uri.slice(8);
            if (mangled.indexOf(extraURI) === -1) {
                mangled.push(extraURI);
            }
        }
        mangled.push(uri);
    }

    for (i = 0; i < mangled.length; i++) {
        var md5sum = crypto.createHash('md5');
        md5sum.update(mangled[i]);
        hashes.push(md5sum.digest('hex'));
    }

    if (mangled.length === 1) {
        conditions = {
            uri_hash: hashes
        };
    } else {
        conditions = {
            uri_hash: { $in: hashes }
        };
    }

    return db.Lookup.findAsync(
        conditions, null,
        {
            skip: opts.skip,
            limit: opts.limit,
            sort:{
                score: -1
            },
        }
    )
    .then(function(found) {
        if (opts.nolog) {
            return found;
        }

        var events = [];
        var i, event;

        // create found events
        for (i = 0; i < found.length; i++) {
            var lookup = found[i];
            event = new db.SearchEvent({
                type: lookup.object_type,
                object: lookup.object_id,
                events: [{
                    event: 'search.uri.found',
                    param: {
                        context: opts.context,
                        uri: lookup.uri,
                    },
                }],
            });
            events.push(event);

            // remove found URLs
            var j = decoded.indexOf(lookup.uri);
            if (j > -1) {
                decoded.splice(j, 1);
            }
        }

        // create notfound events
        for (i = 0; i < decoded.length; i++) {
            event = new db.SearchEvent({
                type: undefined,
                object: undefined,
                events: [{
                    event: 'search.uri.notfound',
                    param: {
                        context: opts.context,
                        uri: decoded[i],
                    },
                }],
            });
            events.push(event);
        }

        return Promise.map(events, command.logEvent)
            .return(found);
    });
};

/* Search for hash in lookup database.
 *
 * Options are the same as for lookupURI.
 *
 * Returns a Promise which resolves to an array of Lookup objects.
 */
exports.lookupHash = function lookupHash(hash, options) {
    var db = hashDb.getDb();
    var distances = {};

    return Promise.all(db.lookupAsync(hash))
        .error(function(err) {
            // TODO: improve lookupAsync rejection to tell us
            // when this fails due to a bad hash input.  Other
            // lookup errors are unlikely, but if they happen they
            // will give a confusing error.

            debug('bad hash: %s: %j', err, hash);
            throw new BadHashError(hash);
        })
        .then(function(hashes) {
            var uris = hashes.map(function(item) {
                distances[item.hash] = item.distance;
                return 'urn:blockhash:' + item.hash;
            });
            return uris;
        })
        .then(function(uris) {
            return exports.lookupURI(uris, options);
        })
        .map(function(lookup) {
            var hashLookup = {
                object_id: lookup.object_id,
                object_type: lookup.object_type,
                distance: distances[lookup.uri.slice(14)],
            };
            return hashLookup;
        });
};
