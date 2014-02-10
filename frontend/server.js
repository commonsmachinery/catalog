/* Catalog web/REST frontend - main script

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
  */

'use strict';

var debug = require('debug')('frontend:server');
var express = require('express');
var redis = require('redis');

var redisClient = redis.createClient();

/*
// This is any error thrown while in a redis call, not just when
// talking to redis.  TODO: Figure out how to do error handling.

redisClient.on('error', function(err) {
    console.error('Error connecting to redis: ' + err);
    process.exit(1);
});
*/

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


/*
var celery = require("node-celery");

var celery_client = celery.createClient({
        CELERY_BROKER_URL: 'amqp://guest:guest@localhost:5672//',
        CELERY_RESULT_BACKEND: 'redis://localhost/0'
});

celery_client.on('connect', function() {
    var result = celery_client.call('cmc_backend.hello', ["world"]);
    setTimeout(function() {

        result.get(function(data) {
                console.log(data);
        });

    }, 100);
});
*/