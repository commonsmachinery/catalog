/* Catalog search - main API to the other modules

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:lookup'); // jshint ignore:line

// Search libs
var db = require('./db');

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

/* Log an event batch into a module-local collection, resorting to
 * logging to file if it fails.
 *
 * Returns a promise that resolves to the logged events.
 */
var logEvent = exports.logEvent = function(event) {
    return new Promise(function(resolve, reject) {
        event.save(function(err, saved, numberAffected) {
            if (err || numberAffected !== 1) {
                // TODO: log this to file
                console.error('failed to save event: %s (%s)', err, numberAffected);
                console.error('failed event: %j', event);
                reject(err || 'no events were saved');
            }
            else {
                resolve(event);
            }
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
        notFound = [uris];
        conditions = {
            uri: uris
        };
    } else {
        notFound = uris.slice();
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
    .map(logEvent)
    .then(function() {
        return results;
    });
};

/* Search for hash in lookup database.
 *
 * Returns a Promise which resolves to an array of Lookup objects.
 */
exports.lookupHash = function lookupHash(conditions, skip, limit) {
    throw new Error('Search by hash not implemented');
};
