/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:main'); // jshint ignore:line

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var express = require('express');
var errorhandler = require('errorhandler');
var morgan = require('morgan');
var Promise = require('bluebird');
var serveStatic = require('serve-static');

var config = require('../lib/config');
var mongo = require('../lib/mongo');
var sessionStore = require('../lib/sessionStore');

var sessions = require('./lib/sessions');
//var rest = require('./lib/rest');
//var admin = require('./lib/admin');
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

    app.use(morgan());
    app.use(bodyParser.json());
    app.use(bodyParser());
    app.use(cookieParser());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.set('views', __dirname + '/views');


    /* ======================= Connect services and start ======================= */

    Promise.join(
        mongo.createConnection(config.auth.db),
        sessionStore(config.frontend.sessionDB))
    .catch(
        function(err) {
            console.error('Services connection error: %s', err);
        })
    .spread(
        function(db, sessionstore) {
            console.log('Services connected... starting server...');

            // Wire up the rest of the app that depended on the
            // infrastructure being available
            sessions.init(app, sessionstore, db);
            //rest.init(app, backend, cluster);
            //admin.init(app);
            webapp.init(app);

            sessions.routes(app);
            //rest.routes(app);
            //admin.routes(app);
            webapp.routes(app);

            app.listen(config.frontend.port);
            console.log('listening on port %s', config.frontend.port);
        });
}

module.exports = main;

if (require.main === module) {
    main();
}
