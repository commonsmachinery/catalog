/* Catalog core - hmsearch load script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:scripts:load-hash'); // jshint ignore:line

// Core libs
var config = require('../../lib/config');

// Script libs
var fs = require('fs');
var ldj = require('ldjson-stream');
var Promise = require('bluebird');
var hmsearch = Promise.promisifyAll(require('hmsearch'));

var argv = require('yargs')
    .boolean('verbose').default('verbose', false)
    .string('format').default('format', 'datapackage')
    .boolean('keepgoing').default('keepgoing', false)
    .demand('_')
    .argv;

var processDataPackage = function(fn, db, verbose, done) {
    var stream = fs.createReadStream(fn).pipe(ldj.parse());
    var count = 0;
    var i;

    stream.on('data', function(obj) {
        stream.pause();

        var media = obj.media;

        if (verbose) {
            console.log('processing work %s...', count++);
        }

        Promise.resolve()
        .then(function() {
            var hashes = [];
            // Pick locator and identifier annotations from work media
            for (i = 0; i < media.length; i++) {
                var mediaAnnotations = media[i].annotations;

                for (var j = 0; j < mediaAnnotations.length; j++) {
                    var ma = mediaAnnotations[j];
                    if (ma.propertyName === 'identifier' && ma.identifierLink.indexOf('urn:blockhash:') === 0) {
                        hashes.push(ma.identifierLink.slice(14));
                    }
                }
            }
            return Promise.map(
                hashes,
                function(hash) {
                    return db.insertAsync(hash);
                },
                { concurrency: hashes.length }
            );
        })
        .then(function() {
            // resume stream processing
            if (verbose) {
                console.log('done.');
            }
            stream.resume();
        })
        .catch(function(err) {
            console.error('error %s: %j', err, obj);
            if (argv.keepgoing) {
                stream.resume();
            }
            else {
                done(err);
            }
        });
    });

    stream.on('end', function() {
        done(null);
    });
};

var main = function() {
    var fn;
    var processPackage;

    if (argv.format && argv.format === 'datapackage') {
        processPackage = processDataPackage;
    } else {
        throw new Error('Unknown format: ' + argv.format);
    }

    if (argv._.length === 0) {
        throw new Error('Package filename not given');
    }

    fn = argv._[0];

    hmsearch.openAsync(config.search.hashDb, hmsearch.READWRITE)
        .then(function(db) {
            return Promise.promisifyAll(db);
        })
        .then(function(db) {
            processPackage(fn, db, argv.verbose, function(err) {
                setTimeout(function() {
                    db.closeSync();
                    if (err) {
                        process.exit(1);
                    } else {
                        process.exit(0);
                    }
                }, 1000);
            });
        })
        .catch(function(err) {
            console.error('error opening database: %s', err);
            process.exit(1);
        });
};

if (require.main === module) {
    main();
}
