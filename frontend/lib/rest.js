/* Catalog web/REST frontend - REST API

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: 
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:rest');
var _ = require('underscore');
var backend;
var baseURI;

var cudCallOptions = { };

function rest(app, localBackend, localBaseURI) {
    backend = localBackend;
    baseURI = localBaseURI;

    // TODO: add request ID checking
    // TODO: add request sanity checking

    /* works */
    app.delete('/works/:workID', deleteWork);
    app.get('/users/:userID/works', getWorks);
    app.get('/users/:userID/works/:workID', getWork);
    app.get('/works', getWorks);
    app.get('/works/:workID', getWork);
    app.get('/works/:workID/completeMetadata', getCompleteMetadata);
    // app.get('/works/:workID/metadata', getMetadata);
    // app.get('/works/:workID/posts', getPosts);
    // app.patch('/works/:workID', patchWork);
    app.post('/works', postWork);
    app.put('/works/:workID', putWork);

    /* sources */
    // app.delete('/users/:userID/sources/:sourceID', deleteSource);
    app.get('/users/:userID/sources', getSources);
    // app.get('/users/:userID/sources/:sourceID', getSource);
    // app.get('/users/:userID/sources/:sourceID/cachedExternalMetadata', getCEM);
    // app.get('/users/:userID/sources/:sourceID/metadata', getMetadata);
    // app.patch('/users/:userID/sources/:sourceID', patchSource);
    // app.put('/users/:userID/sources/:sourceID', putSource);

    // app.delete('/works/:workID/sources/:sourceID', deleteSource);
    app.get('/works/:workID/sources', getSources);
    // app.get('/works/:workID/sources/:sourceID', getSource);
    // app.get('/works/:workID/sources/:sourceID/cachedExternalMetadata', getCEM);
    // app.get('/works/:workID/sources/:sourceID/metadata', getMetadata);
    // app.patch('/works/:workID/sources/:sourceID', patchSource);
    // app.post('/works/:workID/sources', postSource);
    // app.put('/works/:workID/sources/:sourceID', putSource);

    /* posts */
    app.get('/works/:workID/posts', getPosts);
    // app.post('/works/:workID/posts', postPost);
    // app.delete('/works/:workID/posts', deletePost);

    return;
};


function buildURL() {
    return baseURL + '/' + Array.prototype.join.call(arguments, '/');
}

function call (res, queryData, call, view, callback, errorCheck) {
    function checkResponse(data, err) {
        /* ToDo: Recieve error codes only, handle error message here*/
        /* ToDo: Implement error evaluation list (errorCheck) */
        if (err) {
            if(typeof errorCheck == 'String'){
                res.send(errorCheck);
            }
            else if (errorCheck && errorCheck.indexOf(err.exception) >= 0) {
                res.send(err.exception+': ', errorCheck[err.exception]);
            }
            else if (!data){
                res.send(404);
            }
            else {
                res.send(500, 'Error processing event \n', err.exception);
            }
            return;
        }
        if(callback){
            return callback(data)
        }
        res.format({
            'text/html': function(){
                res.render(view, {data: data})
            },
            'application/json': function(){
                res.send(data)
            }
        });
        return;
    }
    var result = backend.call(
        'catalog_backend.' + call, 
        queryData, 
        cudCallOptions
    );
    handleBackendResult(result, checkResponse);
    return;
}

/* when we only need user and id */
function commonData (req) { 
    var user = 'test';
    var queryData =  {
        id: req.params.workID,
        user: user,
    };
    return queryData;
}

function deleteWork(req, res) {
    function respond (work, err) {
        res.send(204, 'successfully deleted work'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = commonData(req);
    var errors = 'Error deleting work.'
    var result = backend.call(res, queryData, 'delete_work', null, respond, errors);
    return;
}

function getPosts (req, res) {
    var queryData = commonData(req);
    call(res, queryData, 'get_sources', respond);
   return;
}

function getSources (req, res) {
    var queryData = commonData(req);
    call(res, queryData, 'get_sources', 'workSources');
    return;
}

function getWork(req, res) {
    // TODO: do sanitychecking on the ID
    var user;
    var queryData = commonData(req);
    call(res, queryData, 'get_work', 'workPermalink');
    return;
}

function getWorks(req, res) {
    var user = 'test';
    var queryData = req.query;
    queryData.user = user;
    call(res, queryData, 'get_works', 'workCollection');
    return;
}

function getCompleteMetadata(req, res) {
    var user = 'test';
    var queryData = req.query;
    queryData = commonData(req);
    queryData.format = req.params.format;
    call(res, queryData, 'get_complete_metadata', 'completeMetadata');
    return;
}


function handleBackendResult(result, callback) {
    result.on('ready', function(message) {
        if (message.status === 'SUCCESS') {
            debug('task result: %j', message.result);
            callback(message.result);
        }
        else {
            var e = { 
                status: message.status, 
                exception: message.result.exc_type 
            };
            console.error('backend task failed: %j', message);
            callback(null, e);
        }
    });
    return;
}

function postWork(req, res) {
    function respond(work, err) {
        var workURI = buildURI('works', work.id);
        debug('successfully added work, redirecting to %s', workURI);
        res.redirect(workURI);
    }

    var user = 'test';
    var workData = {
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        timestamp: Date.now(),
        user: user,
        visibility: req.body.visibility,
    };
    call(res, workData, 'create_work', null, respond, errors);
    return;
}

function putWork(req, res) {
    function respond(work, err) {
        debug('successfully updated work');
        res.send('success');
        return;
    }

    var user = 'test';
    var errors = 'Error updating work.';

    var workData = {
        id: req.params.workID,
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        time: Date.now(),
        user: user,
        visibility: req.body.visibility,
    };
    call(res, workData, 'update_work', null, respond, errors);
    return;
}

module.exports = rest;
