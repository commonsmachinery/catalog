#!/usr/bin/env node

'use strict';

// Ensure that all indexes are setup.  This can safely be run multiple
// times, but may create indexes and thus consume some resources.

var Promise = require('bluebird');

var config = require('../../lib/config');
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');
var event = require('../../modules/event/event');

// Override any index disabling in production setup
config.autoIndex = true;

// Now just connecting to the databases will ensure that
// mongoose creates all indexes.

Promise.all([
    core.init({ensureIndexes: true}),
    event.init({ensureIndexes: true}),
    search.init({ensureIndexes: true, skipHashDB: true})
])
    .then(function() {
        console.log('Indexes created.');
        process.exit(0);
    })
    .catch(function(err) {
        console.error('Error ensuring indexes: %s', err);
        process.exit(1);
    });
