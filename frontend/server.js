#!/usr/bin/env node

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

var defaultConfig = {
    host: '0.0.0.0',
    port: 8004,
    baseURI: 'http://localhost:8004',
    brokerURL: 'amqp://guest@localhost:5672//',
};

var main = function main(config) {


    /* ============================== Frontend Setup ========================= */

    //var redisClient = redis.createClient();
    var app = express();


    // Middlewares
    app.use(express.logger());
    app.use(express.json());

    // Templating
    app.engine('.jade', cons.jade);
    app.set('view engine', 'jade');
    app.set('views', './frontend/views');
    app.use(stylus.middleware({
        src: __dirname + '/styles',
        dest: __dirname + '/public/css',
    }));
    app.use(express.static('./frontend/public'));


    /* ============================== Backend Setup ============================== */

    var backend = celery.createClient({
        CELERY_BROKER_URL: config.brokerURL || defaultConfig.brokerURL,
        CELERY_RESULT_BACKEND: 'amqp',
        CELERY_TASK_RESULT_EXPIRES: 30,
        CELERY_TASK_RESULT_DURABLE: false
    });

    backend.on('error', function(err) {
        console.error('celery error: %s', err);
    });


    // Link frontend logic to the backend
    require('./lib/rest')(app, backend, config.baseURI || defaultConfig.baseURI);
    require('./lib/app')(app);

    // Kick everything off
    backend.once('connect', function() {
        var port = config.port || defaultConfig.port;
        var host = config.host || defaultConfig.host;

        console.log('celery is ready, starting web server');
        app.listen(port, host);
        console.log('listening on %s:%s', host, port);
    });
};

module.exports = main;

var getOpenshiftConfig = function() {
    return {
        host: process.env.OPENSHIFT_NODEJS_IP,
        port: process.env.OPENSHIFT_NODEJS_PORT,
        baseURI: 'http://' + process.env.OPENSHIFT_APP_DNS,
        brokerURL: process.env.OPENSHIFT_RABBITMQ_URI,
    };
};

var getConfig = function() {
    return process.env.OPENSHIFT_NODEJS_PORT ?
        getOpenshiftConfig() : defaultConfig;
};

if (require.main === module) {
    main(getConfig());
}
