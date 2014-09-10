/* Catalog core - data load script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:scripts:load');

// Core libs
var core = require('../core');

// Script libs
var fs = require('fs');
var ldj = require('ldjson-stream');

var argv = require('yargs')
    .boolean('verbose').default('verbose', false)
    .string('user').demand('user')
    .boolean('private').default('private', false)
    .string('format').default('format', 'datapackage')
    .string('ownerOrg').default('ownerOrg', undefined)
    .demand('_')
    .argv;

// Decode media properties known to be URIs in-place
var decodeURIProperties = function decodeURIProperties(p) {
    if (p.propertyName === 'identifier') {
        p.identifierLink = p.identifierLink && decodeURI(p.identifierLink);
    }
    else if (p.propertyName === 'locator') {
        p.locatorLink = p.locatorLink && decodeURI(p.locatorLink);
    }
    else if (p.propertyName === 'creator') {
        p.creatorLink = p.creatorLink && decodeURI(p.creatorLink);
    }
    else if (p.propertyName === 'copyright') {
        p.holderLink = p.holderLink && decodeURI(p.holderLink);
    }
};

var processDataPackage = function(fn, context, owner, priv, verbose, done) {
    var stream = fs.createReadStream(fn).pipe(ldj.parse());

    stream.on('data', function(obj) {
        stream.pause();

        var annotations = obj.annotations;
        var media = obj.media;
        var workId;

        if (verbose) {
            console.log('creating work...');
        }

        core.createWork(context, {
            public: !priv,
            owner: owner,
        })
        .then(function(work) {
            // get work details
            debug('work %s created', work.id);
            workId = work.id;
        })
        .then(function() {
            // Create work annotations

            // Process one annotation at a time, since
            // core doesn't (currently) allow concurrent
            // modifications to a Work.

            // This is done by recursing via promises, so that the
            // function isn't called for the next annotation until the
            // database operation for the previous one has been
            // completed.

            var i = 0;
            var addAnnotation = function() {
                if (i < annotations.length) {
                    debug('creating annotation %s for work %s', i, workId);

                    decodeURIProperties(annotations[i]);
                    var annotationObj = { property: annotations[i] };
                    ++i;

                    return core.createWorkAnnotation(context, workId, annotationObj)
                        .then(addAnnotation);
                }
            };

            return addAnnotation();
        })
        .then(function() {
            // Add identifier and locator media annotations to work for simple search
            var resourceAnnotations = [];
            var i;

            // Pick locator and identifier annotations from work media
            for (i = 0; i < media.length; i++) {
                var mediaAnnotations = media[i].annotations;

                for (var j = 0; j < mediaAnnotations.length; j++) {
                    if (mediaAnnotations[j].propertyName === 'identifier' ||
                        mediaAnnotations[j].propertyName === 'locator') {
                        resourceAnnotations.push(mediaAnnotations[j]);
                    }
                }
            }

            // Same kind of recursion as above
            i = 0;
            var addResourceAnnotation = function() {
                if (i < resourceAnnotations.length) {
                    debug('creating resource annotation %s for work %s', i, workId);

                    decodeURIProperties(resourceAnnotations[i]);
                    var annotationObj = { property: resourceAnnotations[i] };
                    ++i;

                    return core.createWorkAnnotation(context, workId, annotationObj)
                        .then(addResourceAnnotation);
                }
            };

            return addResourceAnnotation();
        })
        .then(function() {
            // Create media using same kind of recursion as above
            var i = 0;
            var addMedia = function() {
                if (i < media.length) {
                    debug('creating media %s for work %s', i, workId);

                    var origAnnotations = media[i].annotations;
                    var createAnnotations = [];

                    for (var j = 0; j < origAnnotations.length; j++) {
                        decodeURIProperties(origAnnotations[j]);
                        createAnnotations.push({
                            property: origAnnotations[j]
                        });
                    }

                    var mediaObj = {
                        annotations: createAnnotations
                    };

                    ++i;

                    return core.createWorkMedia(context, workId, mediaObj)
                        .then(addMedia);
                }
            };

            return addMedia();
        })
        .then(function() {
            // resume stream processing
            if (verbose) {
                console.log('done.');
            }
            workId = null;
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
    var priv;
    var fn;
    var processPackage;
    var userId, ownerOrgId;

    priv = argv.private;

    if (argv.format && argv.format === 'datapackage') {
        processPackage = processDataPackage;
    } else {
        throw new Error('Unknown format: ' + argv.format);
    }

    if (argv._.length === 0) {
        throw new Error('Package filename not given');
    }

    fn = argv._[0];

    core.init()
        .then(function() {
            console.log('core backend started');
        })
        .then(function() {
            if (! /^[0-9a-fA-F]{24}$/.test(argv.user)) {
                return core.getUserByAlias({}, argv.user);
            } else {
                return core.getUser({}, argv.user);
            }
        })
        .then(function(user) {
            userId = user.id;
        })
        .then(function() {
            if (argv.ownerOrg) {
                if (! /^[0-9a-fA-F]{24}$/.test(argv.ownerOrg)) {
                    return core.getOrgByAlias({}, argv.ownerOrg);
                } else {
                    return core.getOrganisation({}, argv.ownerOrg);
                }
            }
        })
        .then(function(org) {
            if (org) {
                ownerOrgId = org.id;
            }
        })
        .then(function() {
            var context;
            var owner;

            context = { userId: userId };

            if (argv.ownerOrg) {
                owner = { org: ownerOrgId };
            } else {
                owner = { user: userId };
            }

            processPackage(fn, context, owner, priv, argv.verbose, function(err) {
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
