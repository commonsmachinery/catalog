'use strict';

var debug = require('debug')('frontend:celery');
var celery = require('node-celery');
var Promise = require('bluebird');


module.exports = function backendClient(options) {
    return new Promise(function(resolve, reject){
        var backend = celery.createClient(options);
        backend.on('connect', function(){
            debug('Connected to celery');
        	resolve(backend);
        });
        backend.on('error', function(err){
            console.log('celery connection error: %s', err);
            reject(err);
        });
        return;
    });
};