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

var config = require('./config.json');
var err = require('./err.json');


/*  Override config.json with enviroment variables  */
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
setEnv(config.common);
setEnv(config[process.env.NODE_ENV || 'development']);


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

    app.use(express.static(__dirname + env.CATALOG_STATIC));


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

            /* Load REST API */
            sessions.init(app, sessionstore);
            rest(app, backend, cluster);

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
