/* Catalog web/REST frontend - main script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
  */

'use strict';

var debug = require('debug')('frontend:server');
var express = require('express');
var redis = require('redis');
var celery = require('node-celery');

var store = require('./lib/store');

var redisClient = redis.createClient();

/*
// This is any error thrown while in a redis call, not just when
// talking to redis.  TODO: Figure out how to do error handling.

redisClient.on('error', function(err) {
    console.error('Error connecting to redis: ' + err);
    process.exit(1);
});
*/

var celeryClient = celery.createClient({
    CELERY_BROKER_URL: 'amqp://guest@localhost:5672//',
    CELERY_RESULT_BACKEND: 'amqp'
});

celeryClient.on('error', function(err) {
    console.error('celery error: %s', err);
    process.exit(1);
});


celeryClient.on('connect', function() {
    var syncRedisClient = redis.createClient();

    syncRedisClient.on('ready', function() {
        console.log('starting event sync to backend');
        store.eventQueueSender(syncRedisClient, celeryClient);
    });
});


//
// Main frontend setup
//

var app = express();

// Middlewares
app.use(express.logger());
app.use(express.json());


// Add in our endpoint logic
require('./lib/rest.js')(app, redisClient, 'http://localhost:8004');


// Kick everything off 

redisClient.on('ready', function() {
    console.log('redis is ready, starting web server');

    app.listen(8004);
    console.log('listening on port 8004');
});
