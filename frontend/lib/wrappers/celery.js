'use strict';

var celery = require('node-celery');
var Promise = require('bluebird');


module.exports = function backendClient(options) {
    return new Promise(function(resolve, reject){
        var backend = celery.createClient(options);
        backend.on('connect', function(){
        	resolve(backend);
        });
        backend.on('error', reject);
        return;
    });
};