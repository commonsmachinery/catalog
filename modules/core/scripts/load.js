/* Catalog core - data load script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

var debug = require('debug')('catalog:core:scripts:load');

// Core libs
var core = require('../core');
var common = require('../lib/common.js');
var mirror = require('../lib/mirror');

// Script libs
var Promise = require('bluebird');
var fs = require('fs');
var ldj = require('ldjson-stream');
var argv = require('yargs')
    .boolean('verbose').default('verbose', false)
    .string('userId').demand('userId')
    .boolean('private').default('private', false)
    .string('format').default('format', 'datapackage')
    .string('ownerOrg').default('ownerOrg', undefined)
    .demand('_')
    .argv;


var processDataPackage = function(fn, context, owner, private, verbose, done) {
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
            // TODO: disable indexing by alias so we don't have
            // to create aliases here and now
            alias: 'work-' + Date.now(),
            public: !private,
            owner: owner,
        })
        .then(function(work) {
            // get work details
            debug('work %s created', work.id);
            workId = work.id;
        })
        .then(function() {
            // add work annotations
            debug('creating annotations for work %s', workId);
            var promiseStack = [];
            for (var i = 0; i < annotations.length; i++) {
                var annotationObj = {
                    property: annotations[i]
                };
                promiseStack.push(core.createWorkAnnotation(context, workId, annotationObj));
            }
            return Promise.settle(promiseStack);
        })
        .then(function() {
            // add work media
            debug('creating media for work %s', workId);
            var promiseStack = [];
            for (var i = 0; i < media.length; i++) {
                var origAnnotations = media[i].annotations;
                var createAnnotations = [];

                for (var j = 0; j < origAnnotations.length; j++) {
                    createAnnotations.push({
                        property: origAnnotations[i]
                    })
                }

                var mediaObj = {
                    annotations: createAnnotations
                }

                promiseStack.push(core.createWorkMedia(context, workId, mediaObj));
            }
            return Promise.settle(promiseStack);
        })
        .then(function() {
            // resume stream processing
            if (verbose) {
                console.log('done.')
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
}

var main = function() {
    var context;
    var owner;
    var private;
    var fn;
    var processPackage;

    common.checkId(argv.userId, core.UserNotFoundError);

    context = {
        userId: argv.userId
    }

    if (argv.ownerOrg) {
        common.checkId(argv.ownerOrg, core.OrganisationNotFoundError);
        owner = {
            org: argv.ownerOrg
        }
    } else {
        owner = {
            user: argv.userId
        }
    }

    private = argv.private;

    if (argv.format && argv.format == 'datapackage') {
        processPackage = processDataPackage;
    } else {
        throw new Error('Unknown format: ' + format);
    }

    if (argv._.length == 0) {
        throw new Error('Package filename not given');
    }

    fn = argv._[0];

    core.init()
        .then(function(obj1) {
            console.log('core backend started');
            mirror.start();

            processPackage(fn, context, owner, private, argv.verbose, function() {
                // wait 1s to make sure the process chain catches up
                setTimeout(function() {
                    process.exit(0);
                }, 1000);
            });
        })
        .catch(function(err) {
            console.error('error starting core backend: %s', err);
        });
};

if (require.main === module) {
    main();
}
