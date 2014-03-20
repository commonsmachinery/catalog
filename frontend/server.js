/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Authors: 
    Peter Liljenberg <peter@commonsmachinery.se>
    Elsa Balderrama <elsa@commonsmachinery.se>

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

//var redis = require('redis');
var backendClient = require('./lib/wrappers/celery');
var cons = require('consolidate');
var debug = require('debug')('frontend:server');
var express = require('express');
var stylus = require('stylus');
var config = require('./config.json');
var err = require('./err.json');

/*  Override config.json with enviroment variables  */
function setEnv (obj) {
    var key;
    var env = process.env;
    var envKey;
    for(key in obj){
        if (obj.hasOwnProperty(key)) {
            envKey = key.toUpperCase();
            env[envKey] = env[envKey] || obj[key];
        }
    }
    return;
}
setEnv(config.common);
setEnv(config[process.env.NODE_ENV]);


function main() {

    /* ============================== Frontend Setup ========================= */

    //var redisClient = redis.createClient();
    var app = express();
    var env = process.env;

    app.set('err', err);

    // Middlewares
    app.use(express.logger());
    app.use(express.json());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.use(stylus.middleware({
        src: __dirname + env.STYLE_SRC,
        dest: __dirname + env.STYLE_DEST,
        compress: true
    }));
    app.use(express.static(__dirname + env.STATIC));
    require('./lib/sessions')(app, express);


    /* ============================== Backend Setup ============================== */

    backendClient({
        CELERY_BROKER_URL: env.BROKER_URL,
        CELERY_RESULT_BACKEND: env.CELERY_RESULT_BACKEND,
        CELERY_TASK_RESULT_EXPIRES: env.CELERY_TASK_RESULT_EXPIRES,
        CELERY_TASK_RESULT_DURABLE: env.CELERY_TASK_RESULT_DURABLE
    })
    .then(
        function(backend){ 
            /* Load REST API */
            require('./lib/rest')(app, backend);
            /* Kick everything off */
            debug('celery is ready, starting web server');
            app.listen(env.PORT);
            debug('listening on port ' + env.PORT);
            return;
        }, function(err){
            console.error('celery error: %s', err);
            return;
        }
    );
    return;
}

module.exports = main;

if (require.main === module) {
    main();
}
