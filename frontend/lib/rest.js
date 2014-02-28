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
    app.delete('/works/:id', deleteWork);
    app.get('/users/:id/works', getWorks);
    app.get('/users/:userID/works/:workID', getWork);
    app.get('/works', getWorks);
    app.get('/works/:id', getWork);
    app.get('/works/:id/completeMetadata', getCompleteMetadata);
    app.get('/works/:id/metadata', getMetadata);
    // app.patch('/works/:id', patchWork);
    app.post('/works', postWork);
    app.put('/works/:id', putWork);

    /* sources */
    app.delete('/users/:userID/sources/:sourceID', deleteSource);
    app.get('/users/:userID/sources', getSources);
    app.get('/users/:userID/sources/:sourceID', getSource);
    app.get('/users/:userID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/users/:userID/sources/:sourceID/metadata', getMetadata);
    // app.patch('/users/:userID/sources/:sourceID', patchSource);
    app.post('/users/:userID/sources', postSource);
    app.put('/users/:userID/sources/:sourceID', putSource);

    app.delete('/works/:workID/sources/:sourceID', deleteSource);
    app.get('/works/:workID/sources', getSources);
    app.get('/works/:workID/sources/:sourceID', getSource);
    app.get('/works/:workID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/works/:workID/sources/:sourceID/metadata', getMetadata);
    // app.patch('/works/:workID/sources/:sourceID', patchSource);
    app.post('/works/:workID/sources', postSource);
    app.put('/works/:workID/sources/:sourceID', putSource);

    /* posts */
    app.get('/works/:id/posts', getPosts);
    app.get('/works/:workID/posts/:postID', getPost);
    app.post('/works/:id/posts', postPost);
    app.delete('/works/:workID/posts/:postID', deletePost);

    return;
};


function buildURI() {
    return baseURI + '/' + Array.prototype.join.call(arguments, '/');
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
        var owner = false;
        if(queryData.user){
            if(queryData.user_id && queryData.user_id == queryData.user){
                owner = true;
            }
            else if (data.creator && data.creator == queryData.user){
                owner = true;
            }
        }
        res.format({
            'text/html': function(){
                res.render(view, {
                    data: data, 
                    owner: owner
                })
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
        id: req.params.id,
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
    var result = call(res, queryData, 'delete_work', null, respond, errors);
    return;
}

function getPosts (req, res) {
    var queryData = commonData(req);
    call(res, queryData, 'get_posts', 'workPosts');
    return;
}

function getPost (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        post_id: req.params.postID,
    }
    call(res, queryData, 'get_post', 'workPost');
    return;
}


function postPost(req, res) {
    function respond(post, err) {
        var postURI = buildURI('works', post.work_id, 'posts', post.post_id);
        debug('successfully added post, redirecting to %s', postURI);
        res.redirect(postURI);
    }

    var user = 'test';
    var errors = 'Error creating post.';

    var postData = {
        user: user,
        timestamp: Date.now(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        resource: req.body.resource,
        work_id: req.params.id,
    };

    call(res, postData, 'add_post', null, respond, errors);
    return;
}

function deletePost (req, res) {
    var user = 'test';

    function respond (work, err) {
        res.send(204, 'successfully deleted post'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = {
        user: user,
        work_id: req.params.workID,
        post_id: req.params.postID,
    }

    var errors = 'Error deleting post.'
    var result = call(res, queryData, 'delete_post', null, respond, errors);
    return;
}

function getSource (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID,
    }
    call(res, queryData, 'get_source', 'workSource');
    return;
}

function postSource(req, res) {
    function respond(source, err) {
        var sourceURI;

        if (source.user_id) {
            sourceURI = buildURI('users', source.user_id, 'sources', source.source_id);
        } else {
            sourceURI = buildURI('works', source.work_id, 'sources', source.source_id);
        }

        debug('successfully added source, redirecting to %s', sourceURI);
        res.redirect(sourceURI);
    }

    var user = 'test';
    var errors = 'Error creating source.';

    var sourceData = {
        user: user,
        timestamp: Date.now(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        resource: req.body.resource,
        work_id: req.params.workID,
        user_id: req.params.userID,
    };

    call(res, sourceData, 'add_source', null, respond, errors);
    return;
}

function putSource(req, res) {
    function respond(work, err) {
        debug('successfully source work');
        res.send('success');
        return;
    }

    var user = 'test';
    var errors = 'Error updating source.';

    var sourceData = {
        user: user,
        timestamp: Date.now(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        resource: req.body.resource,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID
    };
    call(res, sourceData, 'update_source', null, respond, errors);
    return;
}

function deleteSource (req, res) {
    var user = 'test';

    function respond (work, err) {
        res.send(204, 'successfully deleted source'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID,
    }

    var errors = 'Error deleting source.'
    var result = call(res, queryData, 'delete_source', null, respond, errors);
    return;
}

function getSourceMetadata (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID,
        subgraph: "metadata"
    }
    call(res, queryData, 'get_source', 'sourceMetadata');
    return;
}

function getSourceCEM (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID,
        subgraph: "cachedExternalMetadata"
    }
    call(res, queryData, 'get_source', 'sourceCEM');
    return;
}

function getSources (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
    }
    call(res, queryData, 'get_sources', 'workSources');
    return;
}

function getWork(req, res) {
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

function getMetadata(req, res) {
    var user = 'test';
    var queryData = req.query;
    queryData.user = user;
    queryData.id = req.params.id;
    queryData.subgraph = "metadata";
    call(res, queryData, 'get_work', 'workMetadata');
    return;
}

function getCompleteMetadata(req, res) {
    var user = 'test';
    var queryData = req.query;
    queryData.user = user;
    queryData.id = req.params.id;
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
    var errors = 'Error creating work.';

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
        id: req.params.id,
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
