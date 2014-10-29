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
var webapp = require('../lib/webapp');


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
        app.set('json spaces', 4);
    }

    var node_modules = __dirname + '/../../node_modules';

    app.use('/lib/js',
            express.static(node_modules + '/jquery/dist', { index: false }),
            express.static(node_modules + '/bootstrap/dist/js', { index: false }));

    app.use('/lib/css',
            express.static(node_modules + '/bootstrap/dist/css', { index: false }));

    app.use('/lib/fonts',
            express.static(node_modules + '/bootstrap/dist/fonts', { index: false }));

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

            webapp.init(app);
            app.use(rest.readRouter);
            app.use(webapp.router);

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
