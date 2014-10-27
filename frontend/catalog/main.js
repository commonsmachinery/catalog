/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:main'); // jshint ignore:line

// External libs
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var express = require('express');
var errorhandler = require('errorhandler');
var morgan = require('morgan');
var Promise = require('bluebird');
var serveStatic = require('serve-static');

// Common libs
var config = require('../../lib/config');
var mongo = require('../../lib/mongo');
var sessionStore = require('../../lib/sessionStore');

// Modules
var core = require('../../modules/core/core');
var search = require('../../modules/search/search');

// Frontend libs
var rest = require('../lib/rest');

// Catalog frontend libs
var sessions = require('./lib/sessions');
var webapp = require('./lib/webapp');


function main() {

    /* ============================== Frontend Setup ========================= */

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

    app.use(serveStatic(__dirname + config.frontend.static));
    app.use(serveStatic(__dirname + config.frontend.static_lib));

    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/views');


    /* ======================= Connect services and start ======================= */

    Promise.all([
        mongo.createConnection(config.auth.db),
        sessionStore(config.frontend.sessionDB),
        core.init(),
        search.init()
    ])
    .spread(
        function(db, sessionstore, coreOK, searchOK) {
            console.log('Services connected... starting server...');

            // Wire up the rest of the app that depended on the
            // infrastructure being available
            sessions.init(app, sessionstore, db);
            webapp.init(app);

            app.use(rest.readRouter);
            app.use(rest.writeRouter);

            // Web routes must be added after the REST routes, since
            // they are overloaded on the same URLs
            app.use(webapp.router);

            app.listen(config.frontend.port, config.frontend.host);
            console.log('listening on port %s:%s', config.frontend.host, config.frontend.port);
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
