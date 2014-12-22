/* Catalog core - create hashes for work URIs to avoid failIndexKeyTooLong error

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:scripts:create_uri_hashes');
var Promise = require('bluebird');
var crypto = require('crypto');

// Core and search libs
var search = require('../../modules/search/search');
var searchDb = require('../../modules/search/lib/db');

var saveDocument = function(doc) {
    return new Promise(function(resolve, reject) {
        doc.save(function(err, savedDoc, numberAffected) {
            if (err) {
                debug('saving lookup failed: %j', err);
                reject(err);
                return;
            }

            resolve(savedDoc);
        });
    });
};

var processRecords = function(done) {
    var stream = searchDb.Lookup.find().stream();
    var count = 0;

    stream.on('data', function(obj) {
        if (obj.uri) {
            ++count;
            stream.pause();

            Promise.resolve(true)
                .then(function() {
                    console.log('creating uri hash: %s', count);

                    var md5sum = crypto.createHash('md5');
                    md5sum.update(obj.uri);
                    obj.uri_hash = md5sum.digest('hex');

                    return saveDocument(obj);
                })
                .then(function() {
                    // resume stream processing
                    stream.resume();
                })
                .catch(function(err) {
                    console.error('error: %s', err);
                    done(err);
                });
        }
    });

    stream.on('end', function() {
        done(null);
    });
};

var main = function() {
    search.init({skipHashDB: true})
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
            console.error('error starting search backend: %s', err);
            process.exit(1);
        });
};

if (require.main === module) {
    main();
}
