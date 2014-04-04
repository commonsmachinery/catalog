/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Authors: 
    Peter Liljenberg <peter@commonsmachinery.se>
    Elsa Balderrama <elsa@commonsmachinery.se>

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var backendClient = require('./lib/wrappers/celery');
var db = require('./lib/wrappers/mongo');
var sessionStore = require('./lib/wrappers/sessionStore');
var cons = require('consolidate');
var debug = require('debug')('frontend:server');
var express = require('express');
var stylus = require('stylus');
var config = require('./config.json');
var err = require('./err.json');
var cluster = require('./lib/cluster');
var Promise = require('bluebird');

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

    var app = express();
    var env = process.env;

    /* ============================== Frontend Setup ========================= */

    app.set('err', err);

    app.use(express.logger());
    app.use(express.json());
    app.use(express.bodyParser());
    app.use(express.cookieParser());

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
            backendClient({
                CELERY_BROKER_URL: env.CATALOG_BROKER_URL,
                CELERY_RESULT_BACKEND: 'amqp',
                CELERY_TASK_RESULT_EXPIRES: 30,
                CELERY_TASK_RESULT_DURABLE: false
            }), 
            cluster.connect(env.CATALOG_REDIS_URL), 
            db.connect(env.CATALOG_MONGODB_URL + env.CATALOG_USERS_DB),
            sessionStore(env.CATALOG_USERS_DB)
        );
    }

    connectServices()
    .spread(
        function(backend, redis, mongo, sessionstore){
            console.log('Services connected... starting server...');

            /* Load REST API */
            require('./lib/sessions').start(app, express, db, sessionstore);
            require('./lib/rest')(app, backend, cluster);

            app.listen(env.CATALOG_PORT);
            console.log('listening on port %s', env.CATALOG_PORT);

            return;
        }, function(err){
            console.error('Services connection error: %s', err);
            return;
        }
    );

    return;
}

module.exports = main;

if (require.main === module) {
    main();
}
