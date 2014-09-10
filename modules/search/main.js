/* Catalog search - main script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:search:main'); // jshint ignore:line

// Core libs
var search = require('./search');

var main = module.exports = function() {
    search.init()
        .then(function() {
            console.log('search backend started');
        })
        .catch(function(err) {
            console.error('error starting search backend: %s', err);
        });
};

if (require.main === module) {
    main();
}
