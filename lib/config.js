/* Catalog web frontend - app

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

process.env.MUTE_PARSE_ENV = 1;

var debug = require('debug')('catalog:config');
var parseEnv = require('parse-env');

var tpl = require('../config/template.js');

var conf;
var filename;

if (process.env.CATALOG_CONFIG_FILE)
{
    filename = process.env.CATALOG_CONFIG_FILE;
}
else {
    switch (process.env.NODE_ENV)
    {
    case 'test':
        filename = '../config/test.js';
        break;

    case 'production':
        filename = '../config/production.js';
        break;

    default:
        filename = '../config/development.js';
        break;
    }
}

console.log('loading config from: %s', filename);

try {
    conf = require(filename);
}
catch (e) {
    console.error('error reading config file: %s', e);
}

module.exports = parseEnv(process.env, tpl, conf).catalog;

debug('using configuration:\n%s', JSON.stringify(module.exports, null, 4));
