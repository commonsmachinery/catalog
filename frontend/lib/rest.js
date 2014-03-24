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
var env, error;
var cluster;

var cudCallOptions = { };

/* API functions */
var deletePost, deleteSource, deleteWork, getCompleteMetadata, getMetadata, getMetadata, getPost, getSource, getSourceCEM, getSourceCEM, getSources, getSPARQL, getWork, getWorks, patchSource, postPost, postSource, postWork, putSource, putWork; 

function rest(app, localBackend, localCluster) {
    backend = localBackend;
    env = process.env;
    error = app.get('err');
    cluster = localCluster;

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

    /* sparql */
    app.get('/sparql', getSPARQL);

    return;
}


function buildURI() {
    return env.CATALOG_BASE_URL + '/' + Array.prototype.join.call(arguments, '/');
}

function backendResult(result, callback) {
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

function call (res, queryData, action, view, callback) {
    function checkResponse(data, err) {
        /* ToDo: Recieve error codes only, handle error message here*/
        if (err) {
            var code = err.exception;
            if (error.indexOf(code) >= 0) {
                res.send("error [%s]: %s", code, error[code]);
            }
            else if (!data){
                res.send("error [%s]: %s", 404, error[404]);
            }
            else {
                res.send("error [%s]: %s", 500, error[500]);
            }
            return;
        }
        
        if(callback){
            return callback(data);
        }
        var owner = false;
        if(queryData.user){
            if(queryData.user_id && queryData.user_id === queryData.user){
                owner = true;
            }
            else if (data.creator && data.creator === queryData.user){
                owner = true;
            }
        }
        else {
            queryData.store = 'public';
        }
        res.format({
            'text/html': function(){
                res.render(view, {
                    data: data, 
                    owner: owner
                });
            },
            'application/json': function(){
                res.send(data);
            }
        });
        return;
    }
    var result = backend.call(
        'catalog.tasks.' + action,
        queryData, 
        cudCallOptions
    );
    backendResult(result, checkResponse);
    return;
}

/* when we only need user and id */
function commonData (req) { 
    var user = 'test';
    var timestamp = Date.now().toString();
    var id = req.params.id;
    var queryData =  {
        id: id,
        user: user,
        timestamp: timestamp,
    };
    return queryData;
}

/* API functions */

function deleteWork(req, res) {
    function respond (work, err) {
        res.send(204, 'successfully deleted work'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = commonData(req);
    call(res, queryData, 'delete_work', null, respond);
    return;
}

function getPosts (req, res) {
    var queryData = commonData(req);
    call(res, queryData, 'get_posts', 'posts');
    return;
}

function getPost (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        post_id: req.params.postID,
    };

    call(res, queryData, 'get_post', 'workPost');
    return;
}


function postPost(req, res) {
    function respond(post, err) {
        var postURI = buildURI('works', post.work_id, 'posts', post.id);
        debug('successfully added post, redirecting to %s', postURI);
        res.redirect(postURI);
    }

    var user = 'test';
    var work = req.params.id;

    var postData = {
        user: user,
        timestamp: Date.now().toString(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        resource: req.body.resource,
        work_id: work
    };

    cluster.nextSourceID('posts')
    .then(
        function(count){
            postData.post_id = count;
            call(res, postData, 'add_post', null, respond);
            return;
        }
    );

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
        timestamp: Date.now().toString()
    };

    call(res, queryData, 'delete_post', null, respond);
    return;
}

function getSource (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID || null,
        user_id: req.params.userID || null,
        source_id: req.params.sourceID,
    };

    call(res, queryData, 'get_source', 'source');
    return;
}

function postSource(req, res) {
    function respond(source, err) {

        var sourceURI;
        if (source.user_id) {
            sourceURI = buildURI('users', source.user_id, 'sources', source.id);
        } else {
            sourceURI = buildURI('works', source.work_id, 'sources', source.id);
        }

        debug('successfully added source, redirecting to %s', sourceURI);
        res.redirect(sourceURI);
    }

    var user = 'test';

    var sourceData = {
        user: user,
        timestamp: Date.now().toString(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        work_id: req.params.workID || null,
        user_id: req.params.userID || null,
        resource: req.params.resource
    };

    cluster.nextSourceID('sources')
    .then(
        function(count){
            sourceData.source_id = count;
            call(res, sourceData, 'add_source', null, respond);
            return;
        }
    );

    return;
}

function putSource(req, res) {
    function respond(work, err) {
        debug('successfully source work');
        res.send('success');
        return;
    }

    var user = 'test';

    var sourceData = {
        user: user,
        timestamp: Date.now().toString(),
        metadataGraph: req.body.metadataGraph,
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph,
        resource: req.body.resource,
        work_id: req.params.workID,
        user_id: req.params.userID,
        source_id: req.params.sourceID
    };

    call(res, sourceData, 'update_source', null, respond);
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
        timestamp: Date.now().toString()
    };

    call(res, queryData, 'delete_source', null, respond);
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
    };

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
    };

    call(res, queryData, 'get_source', 'sourceCEM');
    return;
}

function getSources (req, res) {
    var user = 'test';

    var queryData = {
        user: user,
        work_id: req.params.workID,
        user_id: req.params.userID,
    };

    call(res, queryData, 'get_sources', 'sources');
    return;
}

function getWork(req, res) {
    var queryData = commonData(req);
    call(res, queryData, 'get_work', 'workPermalink');
    return;
}

function getWorks(req, res) {
    var user = 'test';
    var queryData = req.query || '';
    queryData.user = user;
    call(res, queryData, 'get_works', 'works');
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

function postWork(req, res) {
    function respond(work, err) {
        var workURI = buildURI('works', work.id);
        debug('successfully added work, redirecting to %s', workURI);
        res.redirect(workURI);
    }

    var user = 'test';
    var timestamp = Date.now().toString();

    var workData = {
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        timestamp: timestamp,
        user: user,
        visibility: req.body.visibility,
    };

    cluster.nextSourceID('works')
    .then(
        function(count){
            workData.id = count;
            workData.resource = buildURI('works', count);
            call(res, workData, 'create_work', null, respond);
            return;
        }
    );
    return;
}

function putWork(req, res) {
    function respond(work, err) {
        debug('successfully updated work');
        res.send('success');
        return;
    }

    var user = 'test';
    var workData = {
        id: req.params.id,
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        time: Date.now(),
        user: user,
        visibility: req.body.visibility,
    };

    call(res, workData, 'update_work', null, respond);
    return;
}

function getSPARQL(req, res) {
    var results_format;

    if (req.get('Accept') === "application/json") {
        results_format = "json";
    } else {
        results_format = "xml";
    }


    function respond(result, err) {
        res.send(result);
        return;
    }
    var queryData = {
        query_string: req.query.query,
        results_format: results_format
    };

    call(res, queryData, 'query_sparql', null, respond);
    return;
}

module.exports = rest;
