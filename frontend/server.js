/*
* frontnend - frontend for the Commons Machinery metadata catalog
*
* Copyright 2014 Commons Machinery http://commonsmachinery.se/
*
* Distributed under an AGPLv3 license, please see LICENSE in the top dir.
*/

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
