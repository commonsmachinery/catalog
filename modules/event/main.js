/*
  Catalog event hub - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('catalog:event:main'); // jshint ignore:line

// Event libs
var transfer = require('./lib/transfer');

var main = module.exports = function() {
    transfer.start();
};

if (require.main === module) {
    main();
}
