/* 
  Catalog web/REST frontend - main script

  Copyright 2014 Commons Machinery http://commonsmachinery.se/

  Authors: 
    Peter Liljenberg <peter@commonsmachinery.se>
    Elsa Balderrama <elsa@commonsmachinery.se>

  Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';


/* ============================== Backend Setup ============================== */

//var redis = require('redis');
var celery = require('node-celery');

var backend = celery.createClient({
    CELERY_BROKER_URL: 'amqp://guest@localhost:5672//',
    CELERY_RESULT_BACKEND: 'amqp',
    CELERY_TASK_RESULT_EXPIRES: 30,
    CELERY_TASK_RESULT_DURABLE: false
});

backend.once('error', function(err) {
    console.error('celery error: %s', err);
});

// Kick everything off 
backend.once('connect', function() {
    console.log('celery is ready, starting web server');
    app.listen(8004);
    console.log('listening on port 8004');
});

/* ============================== Frontend Setup ========================= */
var cons = require('consolidate'); 
var debug = require('debug')('frontend:server');
var express = require('express');
var stylus = require('stylus');

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
    dest: __dirname + '/public/css',
}));
app.use(express.static('./public'));

// endpoint logic
var rest = require('./lib/rest.js')(app, backend, 'http://localhost:8004')
