/* Catalog core - data load script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:scripts:load');
var _ = require('underscore');
var Promise = require('bluebird');

// Core and search libs
var knownProperties = require('../../lib/knownProperties');
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');

// Script libs
var fs = require('fs');
var ldj = require('ldjson-stream');

var argv = require('yargs')
    .boolean('verbose').default('verbose', false)
    .string('user').demand('user')
    .boolean('private').default('private', false)
    .string('format').default('format', 'datapackage')
    .string('ownerOrg').default('ownerOrg', undefined)
    .boolean('keepgoing').default('keepgoing', false)
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

// process annotation and return uri/text pairs for every *link *label
var getPropertyLinkAndLabel = function(property) {
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
    return result;
};


// Return the first property with a matching name
var getProperty = function(propertyName, annotations) {
    for (var i = 0; i < annotations.length; i++) {
        var a = annotations[i];
        if (a.propertyName === propertyName) {
            return a;
        }
    }

    return null;
};

var getIdentifierLink = function(annotations) {
    var a = getProperty('identifier', annotations);
    return a && a.identifierLink;
};

var getLocatorLink = function(annotations) {
    var a = getProperty('locator', annotations);
    return a && a.locatorLink;
};

var processDataPackage = function(fn, context, owner, priv, verbose, done) {
    var stream = fs.createReadStream(fn).pipe(ldj.parse());
    var errorFileName = 'errors_load_db_' + (new Date()).toISOString() + '.json';
    var count = 0;

    var logError = function(obj) {
        fs.appendFile(errorFileName, JSON.stringify(obj) + '\n');
    };

    var createWork = function(obj) {
        var annotations = obj.annotations;
        var media = obj.media;
        var workId;
        var createdAnnotations = [];

        return core.createWork(context, {
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
                    knownProperties.unsetValue(annotations[i]);

                    // Assume work annotations are very good
                    var annotationObj = { property: annotations[i], score: 99 };
                    ++i;

                    return core.createWorkAnnotation(context, workId, annotationObj)
                        .then(function (annotation) {
                            createdAnnotations.push(annotation);
                            return addAnnotation();
                        });
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
                    knownProperties.unsetValue(resourceAnnotations[i]);

                    // Annotations copied from media get a lower score, since
                    // they just identify an instance of the work, not the work
                    // as a whole
                    var annotationObj = { property: resourceAnnotations[i], score: 90 };
                    ++i;

                    return core.createWorkAnnotation(context, workId, annotationObj)
                        .then(function (annotation) {
                            createdAnnotations.push(annotation);
                            return addResourceAnnotation();
                        });
                }
            };

            return addResourceAnnotation();
        })

        // Populate the search index with all the work annotations
        .then(function() {
            return createdAnnotations;
        })
        .map(function(annotation) {
            var lookup = getPropertyLinkAndLabel(annotation.property);
            if (lookup.uri || lookup.text) {
                _.extend(lookup, {
                    object_type: 'core.Work',
                    object_id: workId,
                    property_type: annotation.property.propertyName,
                    property_id: annotation.id,
                    score: annotation.score,
                });

                debug('indexing %j', lookup);

                return search.createLookup(lookup);
            }
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
                        knownProperties.unsetValue(origAnnotations[j]);

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
        });
    };

    // Process work records
    stream.on('data', function(obj) {
        var workURI = getIdentifierLink(obj.annotations) || getLocatorLink(obj.annotations);

        ++count;

        if (!workURI) {
            // There must be a work URI
            console.error('%s: error: no identifier or locator link (json written to error file)', count);
            logError(obj);
            return;
        }

        // Don't get more events while we're processing this one
        stream.pause();

        // Check for duplicates
        search.lookupURI(workURI, {skip: 0, limit: 1, nolog: true})
            .then(function(matches) {
                if (matches.length > 0) {
                    if (verbose) {
                        console.log('%s: skipping duplicate: %s', count, workURI);
                        return;
                    }
                }

                if (verbose) {
                    console.log('%s: creating: %s', count, workURI);
                }

                return createWork(obj);
            })
            .then(function() {
                // resume stream processing
                stream.resume();
            })
            .catch(function(err) {
                console.error('%s: error: %s (json written to error file)', count, err);
                logError(obj);

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

    Promise.all([
        core.init(),
        search.init({skipHashDB: true})
    ])
        .then(function() {
            console.log('connected to databases');
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
