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
var celery = require('node-celery');
var cons = require('consolidate');
var debug = require('debug')('frontend:server');
var express = require('express');
var stylus = require('stylus');


var main = function main(config) {
    if (!config.baseURI) {
        config.baseURI = 'http://localhost:' + config.port;
    }

    /* ============================== Frontend Setup ========================= */

    //var redisClient = redis.createClient();
    var app = express();


    // Middlewares
    app.use(express.logger());
    app.use(express.json());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.use(stylus.middleware({
        src: __dirname + '/styles',
        dest: __dirname + '/public',
        compress: true
    }));
    app.use(express.static(__dirname + '/public'));


    /* ============================== Backend Setup ============================== */

    var backend = celery.createClient({
        CELERY_BROKER_URL: config.brokerURL || 'amqp://guest@localhost:5672//',
        CELERY_RESULT_BACKEND: 'amqp',
        CELERY_TASK_RESULT_EXPIRES: 30,
        CELERY_TASK_RESULT_DURABLE: false
    });

    backend.on('error', function(err) {
        console.error('celery error: %s', err);
    });


    // Link frontend logic to the backend
    require('./lib/rest')(app, backend, config.baseURI);
    require('./lib/app')(app);

    // Kick everything off
    backend.once('connect', function() {
        console.log('celery is ready, starting web server');
        app.listen(config.port);
        console.log('listening on port ' + config.port);
    });
};

module.exports = main;

if (require.main === module) {
    main({ port: 8004 });
}
