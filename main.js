/*
  Catalog all-in-one process, only intended for development testing.

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

var frontend = require('./frontend/main');
var core = require('./modules/core/main');
var event = require('./modules/event/main');

frontend();
core();
event();
