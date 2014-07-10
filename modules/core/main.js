/* Catalog core - backend main script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:core:main'); // jshint ignore:line


// Core libs
var core = require('./core');
var mirror = require('./lib/mirror');

var main = module.exports = function() {
    core.init()
        .then(function() {
            console.log('core backend started');
            mirror.start();
        })
        .catch(function(err) {
            console.error('error starting core backend: %s', err);
        });
};

if (require.main === module) {
    main();
}
