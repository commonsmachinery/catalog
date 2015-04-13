/* Catalog core - remove works and lookup records matching a collection

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:scripts:delete_collection');
var Promise = require('bluebird');

// Core and search libs
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');
var coreDb = require('../../modules/core/lib/db');
var searchDb = require('../../modules/search/lib/db');

var argv = require('yargs')
    .boolean('verbose').default('verbose', false)
    .string('collectionLink').demand('collectionLink')
    .argv;

var removeDocument = function(doc) {
    return new Promise(function(resolve, reject) {
        doc.remove(function(err) {
            if (err) {
                debug('removing document failed: %j', err);
                reject(err);
                return;
            }

            resolve(doc);
        });
    });
};

var processRecords = function(done) {
    var stream = coreDb.Work.find().elemMatch('annotations', {
        'property.collectionLink': argv.collectionLink
    }).stream();
    var count = 0;

    stream.on('data', function(obj) {
        ++count;
        stream.pause();

        Promise.resolve(true)
        .then(function() {
            if (argv.verbose) {
                console.log('removing work ' + obj.id);
            }

            searchDb.Lookup.remove({
                object_type: 'core.Work',
                object_id: obj.id,
            }, function(err) {
                if (err) {
                    throw new Error('failed to remove lookup records for work ' + obj.id);
                }
            });

            return removeDocument(obj);
        })
        .then(function() {
            // resume stream processing
            stream.resume();
        })
        .catch(function(err) {
            console.error('error: %s', err);
            done(err);
        });
    });

    stream.on('end', function() {
        done(null);
    });
};

var main = function() {
    Promise.all([
        core.init(),
        search.init({skipHashDB: true})
    ])
    .then(function() {
        console.log('connected to database');
    })
    .then(function() {
        processRecords(function(err) {
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
