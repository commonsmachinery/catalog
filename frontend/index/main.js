/* 
  Catalog index frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:index:main'); // jshint ignore:line

// External libs
var bodyParser = require('body-parser');
var express = require('express');
var errorhandler = require('errorhandler');
var morgan = require('morgan');
var Promise = require('bluebird');

// Common libs
var config = require('../../lib/config');

// Modules
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');

// Frontend libs
var rest = require('../lib/rest');


function main() {
    var app = express();
    var env = process.env;

    if (env.NODE_ENV !== 'production') {
        console.warn('NODE_ENV: %s', env.NODE_ENV);
    }
    else {
        console.log('starting in production mode');
    }

    // Middlewares

    if (process.env.NODE_ENV === 'development'){
        app.use(errorhandler());
        app.locals.pretty = true;
    }

    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));

    /* ======================= Connect services and start ======================= */

    Promise.all([
        core.init(),
        search.init()
    ])
    .spread(
        function(coreOK, searchOK) {
            console.log('Services connected... starting server...');

            app.use(rest.readRouter);

            app.listen(config.frontend.port, config.frontend.host);
            console.log('listening on %s:%s', config.frontend.host, config.frontend.port);
        })
    .catch(
        function(err) {
            console.error('Services connection error: %s', err);
            process.exit(1);
        });
}

module.exports = main;

if (require.main === module) {
    main();
}
