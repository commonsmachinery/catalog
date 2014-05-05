/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Artem Popov <artfwo@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

process.env.MUTE_PARSE_ENV = 1;
var parseEnv = require('parse-env');

var tpl = require('../config.template.js');

var conf;

try {
    var default_filename = '../config/development.js';
    var config_filename = process.env.CATALOG_FRONTEND_CONFIG_FILE || default_filename;
    conf = require(config_filename);
}
catch(e) {}

module.exports = parseEnv(process.env, tpl, conf);
