/* Catalog web/REST frontend - main script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
  */

'use strict';

var debug = require('debug')('frontend:server');
var express = require('express');
//var redis = require('redis');
var celery = require('node-celery');

var store = require('./lib/store');

//var redisClient = redis.createClient();

var backend = celery.createClient({
    CELERY_BROKER_URL: 'amqp://guest@localhost:5672//',
    CELERY_RESULT_BACKEND: 'amqp',
    CELERY_TASK_RESULT_EXPIRES: 30,
    CELERY_TASK_RESULT_DURABLE: false,
});

backend.on('error', function(err) {
    console.error('celery error: %s', err);
});


//
// Main frontend setup
//

var app = express();

// Middlewares
app.use(express.logger());
app.use(express.json());


// Add in our endpoint logic
require('./lib/rest.js')(app, backend, 'http://localhost:8004');


// Kick everything off 

backend.on('connect', function() {
    console.log('celery is ready, starting web server');

    app.listen(8004);
    console.log('listening on port 8004');
});
