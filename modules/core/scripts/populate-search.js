/* Catalog core - data load script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:scripts:populate-search');

// Core libs
var core = require('../core.js');
var search = require('../../search/search.js');
var event = require('../../event/event.js');

// Script libs
var Promise = require('bluebird');
var _ = require('underscore');
var argv = require('yargs')
    .string('date').demand('date')
    .boolean('clearDb').default('clearDb', false)
    .argv;

// process annotation and return uri/text pairs for every *link *label
var processProperty = function processProperty(property) {
    var pn = property.propertyName;

    var result = {
        uri: undefined,
        text: undefined,
    };

    if (pn === 'identifier') {
        result.uri = property.identifierLink;
    }
    else if (pn === 'title') {
        result.text = property.titleLabel;
    }
    else if (pn === 'locator') {
        result.uri = property.locatorLink;
    }
    else if (pn === 'creator') {
        result.uri = property.creatorLink;
        result.text = property.creatorLabel;
    }
    else if (pn === 'copyright') {
        result.uri = property.holderLink;
        result.text = property.holderLabel;
    }
    else if (pn === 'policy') {
        result.uri = property.statementLink;
        result.text = property.statementLabel;
    }
    else {
        result.text = property.value;
    }
    return result;
};

/** Populate search database from event log starting with a given date
 */
var processEventStream = function processEventStream(startDate, done) {
    // Only use core.work.annotation.added for now
    var stream =  event.getEventStream(startDate, 'core.work.annotation.added');

    stream.on('data', function(eventBatch) {
        stream.pause();

        Promise.resolve().then(function () {
            // Process one event at a time by recursing via promises
            var i = 0;
            var events = eventBatch.events;

            var processEvent = function() {
                if (i < events.length) {
                    var e = events[i];
                    debug('processing event %s', i);

                    if (e.event === 'core.work.annotation.added') {
                        var property = e.param.annotation.property;
                        var src = processProperty(property);
                        _.extend(src, {
                            object_type: eventBatch.type,
                            object_id: eventBatch.object,
                            property_type: property.propertyName,
                            property_id: e.param.annotation.id,
                        });

                        ++i;
                        return search.createLookup(src)
                            .then(processEvent);
                    }
                    else {
                        // just continue processing if the event type is unknown
                        ++i;
                        return processEvent;
                    }
                }
            };

            return processEvent();
        })
        .then(function() {
            stream.resume();
        })
        .catch(function(err) {
            console.error('error %s', err);
            done(err);
        });
    });

    stream.on('end', function() {
        done(null);
    });
};

var main = function() {
    core.init()
        .then(search.init)
        .then(event.init)
        .then(function() {
            if (argv.clearDb) {
                console.log('Clearing search database');
                var searchDb = require('../../search/lib/db.js');
                return searchDb.Lookup.removeAsync();
            }
        })
        .then(function() {
            var date;

            date = Date.parse(argv.date);

            if (!date) {
                throw new Error('Could not parse date: ' + argv.date);
            }

            debug('Processing events from %s', Date.toString());

            processEventStream(date, function(err) {
                // wait 1s to make sure the process chain catches up
                setTimeout(function() {
                    if (err) {
                        process.exit(1);
                    } else {
                        process.exit(0);
                    }
                }, 1000);
            });
        })
        .catch(function(err) {
            console.error('error starting core backend: %s', err);
            process.exit(1);
        });
};

if (require.main === module) {
    main();
}
