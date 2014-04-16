/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Authors: 
    Peter Liljenberg <peter@commonsmachinery.se>
    Elsa Balderrama <elsa@commonsmachinery.se>

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:server');

/*  Override config.json with enviroment variables.  Do it very early
 *  to let all our modules use the values later.
 */
function setEnv (obj) {
    var key;
    var env = process.env;
    var envKey;
    for(key in obj){
        if (obj.hasOwnProperty(key)) {
            envKey = 'CATALOG_' + key.toUpperCase();
            env[envKey] = env[envKey] || obj[key];
            debug('setting %s = %s', envKey, env[envKey]);
        }
    }
    return;
}

var config = require('./config.json');
setEnv(config.common);
setEnv(config[process.env.NODE_ENV || 'development']);


var cons = require('consolidate');
var express = require('express');
var stylus = require('stylus');
var Promise = require('bluebird');

var sessionStore = require('./lib/wrappers/sessionStore');
var backend = require('./lib/backend');
var db = require('./lib/wrappers/mongo');
var cluster = require('./lib/cluster');

var sessions = require('./lib/sessions');
var rest = require('./lib/rest');

var err = require('./err.json');


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

    app.configure('development', function(){
        app.use(express.errorHandler());
        app.locals.pretty = true;
    });

    app.use(express.static(__dirname + env.CATALOG_STATIC));

    app.use(express.logger());
    app.use(express.json());
    app.use(express.bodyParser());
    app.use(express.cookieParser());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.use(stylus.middleware({
        src: __dirname + env.CATALOG_STYLE_SRC,
        dest: __dirname + env.CATALOG_STYLE_DEST,
        compress: true
    }));



    /* ======================= Connect services and start ======================= */

    function connectServices () {
        return new Promise.join(
            backend.connect(env.CATALOG_BROKER_URL),
            cluster.connect(env.CATALOG_REDIS_URL),
            db.connect(env.CATALOG_MONGODB_URL + env.CATALOG_USERS_DB),
			sessionStore(env.CATALOG_MONGODB_URL, env.CATALOG_USERS_DB)
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

            sessions.routes(app);
            rest.routes(app);

            // TODO: the non-REST stuff should be served properly, but
            // for now just provide a home link
            app.get('/', function(req, res) {
                res.render('home');
            });

            app.listen(env.CATALOG_PORT);
            console.log('listening on port %s', env.CATALOG_PORT);

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
