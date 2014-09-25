/*
  Catalog all-in-one process, only intended for development testing.

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

var catalog = require('./frontend/catalog/main');
var core = require('./modules/core/main');
var event = require('./modules/event/main');
var search = require('./modules/search/main');

catalog();
core();
event();
search();
