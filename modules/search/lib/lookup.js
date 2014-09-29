/* Catalog search - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:lookup'); // jshint ignore:line

// Search libs
var db = require('./db');
var hashDb = require('./hashDb');

// Common modules
var command = require('../../../lib/command');

// External libs
var Promise = require('bluebird');

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
 * Returns a Promise which resolves to an array of Lookup objects.
 */
exports.lookupURI = function lookupURI(uris, context, skip, limit) {
    var conditions;
    var notFound; // local copy of uris for creating notfound events later
    var results;

    if (typeof uris === 'string') {
        notFound = [decodeURI(uris)];
        conditions = {
            uri: uris
        };
    } else {
        notFound = uris.map(decodeURI);
        conditions = {
            uri: { $in: uris }
        };
    }

    return db.Lookup.findAsync(
        conditions, null,
        {
            skip: skip,
            limit: limit,
            sort:{
                score: -1
            },
        }
    )
    .map(function(lookup) {
        // remove discovered URLs from notFound
        var i = notFound.indexOf(lookup.uri);
        if (i > -1) {
            notFound.splice(i, 1);
        }

        return lookup;
    })
    .then(function(found) {
        var events = [];
        var i, event;

        // create notfound events
        for (i = 0; i < notFound.length; i++) {
            event = new db.SearchEvent({
                type: undefined,
                object: undefined,
                events: [{
                    event: 'search.uri.notfound',
                    param: {
                        context: context,
                        uri: notFound[i],
                    },
                }],
            });
            events.push(event);
        }

        // create found events
        for (i = 0; i < found.length; i++) {
            var lookup = found[i];
            event = new db.SearchEvent({
                type: lookup.object_type,
                object: lookup.object_id,
                events: [{
                    event: 'search.uri.found',
                    param: {
                        context: context,
                        uri: lookup.uri,
                    },
                }],
            });
            events.push(event);
        }

        results = found;
        return events;
    })
    .map(command.logEvent)
    .then(function() {
        return results;
    });
};

/* Search for hash in lookup database.
 *
 * Returns a Promise which resolves to an array of Lookup objects.
 */
exports.lookupHash = function lookupHash(hash, context, skip, limit) {
    var db = hashDb.getDb();
    return Promise.all(db.lookupAsync(hash))
        .then(function(hashes) {
            var uris = hashes.map(function(item) {
                return 'urn:bmvhash:' + item.hash;
            });
            return uris;
        })
        .then(function(uris) {
            return exports.lookupURI(uris, context, skip, limit);
        });
};
