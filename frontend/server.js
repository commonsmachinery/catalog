/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Authors: 
    Peter Liljenberg <peter@commonsmachinery.se>
    Elsa Balderrama <elsa@commonsmachinery.se>

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:server'); // jshint ignore:line

var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cons = require('consolidate');
var express = require('express');
var errorhandler = require('errorhandler');
var morgan = require('morgan');
var Promise = require('bluebird');
var serveStatic = require('serve-static');
var stylus = require('stylus');

var sessionStore = require('./lib/wrappers/sessionStore');
var backend = require('./lib/backend');
var db = require('./lib/wrappers/mongo');
var cluster = require('./lib/cluster');

var sessions = require('./lib/sessions');
var rest = require('./lib/rest');
var admin = require('./lib/admin');

var err = require('./err.json');
var config = require('./lib/config');


function main() {

    /* ============================== Frontend Setup ========================= */

    //var redisClient = redis.createClient();
    var app = express();
    var env = process.env;

    if (env.NODE_ENV !== 'production') {
        console.warn('NODE_ENV: %s', env.NODE_ENV);
    }
    else {
        console.log('starting in production mode');
    }

    app.set('err', err);

    // Middlewares

    if (process.env.NODE_ENV === 'development'){
        app.use(errorhandler());
        app.locals.pretty = true;
    }

    app.use(serveStatic(__dirname + config.catalog.static));

    app.use(morgan());
    app.use(bodyParser.json());
    app.use(bodyParser());
    app.use(cookieParser());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.use(stylus.middleware({
        src: __dirname + config.catalog.style_src,
        dest: __dirname + config.catalog.style_dest,
        compress: true
    }));



    /* ======================= Connect services and start ======================= */

    function connectServices () {
        return new Promise.join(
            backend.connect(config.catalog.brokerURL),
            cluster.connect(config.catalog.redisURL),
            db.connect(config.catalog.mongodbURL + config.catalog.usersDB),
			sessionStore(config.catalog.mongodbURL + config.catalog.usersDB)
        );
    }

    connectServices()
    .spread(
        function(backend, redis, mongo, sessionstore){
            console.log('Services connected... starting server...');

            // Wire up the rest of the app that depended on the
            // infrastructure being available
            sessions.init(app, sessionstore);
            rest.init(app, backend, cluster);
            admin.init(app);

            sessions.routes(app);
            rest.routes(app);
            admin.routes(app);

            // TODO: the non-REST stuff should be served properly, but
            // for now just provide a home link
            app.get('/', function(req, res) {
                res.render('home');
            });

            app.listen(config.catalog.port);
            console.log('listening on port %s', config.catalog.port);

            return;
        }, function(err){
            console.error('Services connection error: %s', err);
        }
    );

    return;
}

module.exports = main;

if (require.main === module) {
    main();
}
