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

var BackendError = require('./backend').BackendError;
var requireUser = require('./sessions').requireUser;

var backend;
var env;
var cluster;

// TODO: this should perhaps go into a json file instead
var errorMap = {
    // TODO: get real error types from backend tasks
    'ParamError': 400,
    'EntryAccessError': 403,
    'EntryNotFoundError': 404,
};


/* API functions */
var deletePost,
    deleteSource,
    deleteWork,
    getCompleteWorkMetadata,
    getPost,
    getPosts,
    getSource,
    getSourceCEM,
    getSourceMetadata,
    getStockSources,
    getWork,
    getWorkMetadata,
    getWorkSources,
    getSPARQL,
    getWork,
    getWorks,
    patchSource,
    postPost,
    postStockSource,
    postWork,
    postWorkSource,
    putSource,
    putWork;

function rest(app, localBackend, localCluster) {
    backend = localBackend;
    env = process.env;
    cluster = localCluster;

    // TODO: add request ID checking
    // TODO: add request sanity checking

    /* works */
    app.delete('/works/:workID', requireUser, deleteWork);
    app.get('/works', getWorks);
    app.get('/works/:workID', getWork);
    app.get('/works/:workID/completeMetadata', getCompleteWorkMetadata);
    app.get('/works/:workID/metadata', getWorkMetadata);
    // app.patch('/works/:workID', patchWork);
    app.post('/works', requireUser, postWork);
    app.put('/works/:workID', requireUser, putWork);

    /* sources */
    app.delete('/users/:userID/sources/:sourceID', requireUser, deleteSource);
    app.get('/users/:userID/sources', requireUser, getStockSources);
    app.get('/users/:userID/sources/:sourceID', requireUser, getSource);
    app.get('/users/:userID/sources/:sourceID/cachedExternalMetadata', requireUser, getSourceCEM);
    app.get('/users/:userID/sources/:sourceID/metadata', requireUser, getSourceMetadata);
    // app.patch('/users/:userID/sources/:sourceID', patchSource);
    app.post('/users/:userID/sources', requireUser, postStockSource);
    app.put('/users/:userID/sources/:sourceID', requireUser, putSource);

    app.delete('/works/:workID/sources/:sourceID', requireUser, deleteSource);
    app.get('/works/:workID/sources', getWorkSources);
    app.get('/works/:workID/sources/:sourceID', getSource);
    app.get('/works/:workID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/works/:workID/sources/:sourceID/metadata', getSourceMetadata);
    // app.patch('/works/:workID/sources/:sourceID', patchSource);
    app.post('/works/:workID/sources', requireUser, postWorkSource);
    app.put('/works/:workID/sources/:sourceID', requireUser, putSource);

    /* posts */
    app.get('/works/:workID/posts', getPosts);
    app.get('/works/:workID/posts/:postID', getPost);
    app.post('/works/:workID/posts', requireUser, postPost);
    app.delete('/works/:workID/posts/:postID', requireUser, deletePost);

    /* sparql */
    app.get('/sparql', getSPARQL);

    return;
}


function buildURI() {
    return env.CATALOG_BASE_URL + '/' + Array.prototype.join.call(arguments, '/');
}

function buildUserURI(userID) {
    return buildURI('users', userID);
}

function buildWorkURI(workID) {
    return buildURI('works', workID);
}

function buildWorkSourceURI(workID, sourceID) {
    return buildURI('works', workID, 'sources', sourceID);
}

function buildWorkPostURI(workID, postID) {
    return buildURI('works', workID, 'posts', postID);
}

function buildStockSourceURI(userID, sourceID) {
    return buildURI('users', userID, 'sources', sourceID);
}


function workURIFromReq(req) {
    if (req.params.workID) {
        return buildWorkURI(req.params.workID);
    }

    throw new Error('missing workID param');
}

function workSourceURIFromReq(req) {
    if (req.params.workID && req.params.sourceID) {
        return buildWorkSourceURI(req.params.workID, req.params.sourceID);
    }

    throw new Error('missing workID or sourceID param');
}

function workPostURIFromReq(req) {
    if (req.params.workID && req.params.postID) {
        return buildWorkPostURI(req.params.workID, req.params.postID);
    }

    throw new Error('missing workID or postID param');
}

function stockSourceURIFromReq(req) {
    // Ugly, but this should anyway be changed into collections
    if (req.params.sourceID) {
        return buildStockSourceURI(req.session.uid, req.params.sourceID);
    }

    throw new Error('missing sourceID param');
}



function call (res, queryData, action, view, callback) {
    backend.call(action, queryData).
        then(function(data) {
            var owner = false;

            if (callback) {
                return callback(data);
            }

            if (queryData.user) {
                if (queryData.user_id && queryData.user_id === queryData.user) {
                    owner = true;
                }
                else if (data.creator && data.creator === queryData.user) {
                    owner = true;
                }
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
        }).
        error(function(error) {
            res.send(errorMap[error.type] || 500, error);
        }).
        catch(BackendError, function(e) {
            // It's already been logged
            res.send(503, env.NODE_ENV === 'production' ? 'Temporary internal error' : e.message);
        }).
        catch(function(e) {
            console.error('exception in task %s: %s', action, e.stack);
            res.send(500, env.NODE_ENV === 'production' ? 'Internal error' : e.stack);
        }).
        done();
}

/* when we only need user and id */
function commonData (req) { 
    return {
        user_uri: req.session.uid ? buildUserURI(req.session.uid) : null,
    };
}

/* API functions */

function deleteWork(req, res) {
    function respond (work, err) {
        res.send(204, 'successfully deleted work'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    call(res, queryData, 'delete_work', null, respond);
    return;
}

function getPosts (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    call(res, queryData, 'get_posts', 'posts');
    return;
}

function getPost (req, res) {
    var queryData = commonData(req);
    queryData.post_uri = workPostURIFromReq(req);

    call(res, queryData, 'get_post', 'workPost');
    return;
}


function postPost(req, res) {
    var postURI;

    function respond(post, err) {
        debug('successfully added post, redirecting to %s', postURI);
        res.redirect(postURI);
    }

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    queryData.post_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    cluster.increment('next-post-id')
    .then(
        function(postID){
            postURI = buildWorkPostURI(req.params.workID, postID);
            queryData.post_uri = postURI;
            queryData.post_data.id = postID;
            call(res, queryData, 'create_post', null, respond);
            return;
        }
    );

    return;
}

function deletePost (req, res) {
    function respond (work, err) {
        res.send(204, 'successfully deleted post'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = commonData(req);
    queryData.post_uri = workPostURIFromReq(req);

    call(res, queryData, 'delete_post', null, respond);
    return;
}

function getSource (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    call(res, queryData, 'get_source', 'source');
    return;
}

function postWorkSource(req, res) {
    var sourceURI;

    function respond(source, err) {
        debug('successfully added work source, redirecting to %s', sourceURI);
        res.redirect(sourceURI);
    }

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    queryData.source_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    cluster.increment('next-source-id')
    .then(
        function(sourceID){
            sourceURI = buildWorkSourceURI(
                req.params.workID, sourceID);
            queryData.source_uri = sourceURI;
            queryData.source_data.id = sourceID;
            call(res, queryData, 'create_work_source', null, respond);
            return;
        }
    );

    return;
}

function postStockSource(req, res) {
    var sourceURI;

    function respond(source, err) {
        debug('successfully added work source, redirecting to %s', sourceURI);
        res.redirect(sourceURI);
    }

    var queryData = commonData(req);

    queryData.source_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    cluster.increment('next-source-id')
    .then(
        function(sourceID){
            sourceURI = buildStockSourceURI(req.session.uid, sourceID);
            queryData.source_uri = sourceURI;
            queryData.source_data.id = sourceID;
            call(res, queryData, 'create_stock_source', null, respond);
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

    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    queryData.source_data = _.pick(
        req.body, 'metadataGraph', 'cachedExternalMetadataGraph', 'resource');

    call(res, queryData, 'update_source', null, respond);
    return;
}

function deleteSource (req, res) {
    function respond (work, err) {
        res.send(204, 'successfully deleted source'); 
        return;
         // TODO: this could be 202 Accepted if we add undo capability
    }

    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    call(res, queryData, 'delete_source', null, respond);
    return;
}

function getSourceMetadata (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    queryData.subgraph = 'metadata';

    call(res, queryData, 'get_source', 'sourceMetadata');
    return;
}

function getSourceCEM (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    queryData.subgraph = 'cachedExternalMetadata';

    call(res, queryData, 'get_source', 'sourceCEM');
    return;
}

function getWorkSources (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    call(res, queryData, 'get_work_sources', 'sources');
    return;
}

function getStockSources (req, res) {
    var queryData = commonData(req);

    call(res, queryData, 'get_stock_sources', 'sources');
    return;
}

function getWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    call(res, queryData, 'get_work', 'workPermalink');
    return;
}


function getWorks(req, res) {
    var queryData = commonData(req);

    queryData.offset = req.query.offset || 0;
    queryData.limit = req.query.limit || 0;
    queryData.query = req.query;

    call(res, queryData, 'query_works_simple', 'works');
    return;
}

function getWorkMetadata(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);
    queryData.subgraph = "metadata";

    call(res, queryData, 'get_work', 'workMetadata');
    return;
}

function getCompleteWorkMetadata(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);
    queryData.format = 'json';

    call(res, queryData, 'get_complete_metadata', 'completeMetadata');
    return;
}

function postWork(req, res) {
    var workURI;

    function respond(work, err) {
        debug('successfully added work, redirecting to %s', workURI);
        res.redirect(workURI);
    }

    var queryData = commonData(req);
    queryData.work_data = {
        metadataGraph: req.body.metadataGraph || {},
        state: req.body.state || 'draft',
        visibility: req.body.visibility || 'private',
    };

    cluster.increment('next-work-id')
    .then(
        function(workID){
            workURI = buildWorkURI(workID);
            queryData.work_uri = workURI;
            queryData.work_data.id = workID;
            call(res, queryData, 'create_work', null, respond);
            return;
        }
    );
    return;
}

function putWork(req, res) {
    function respond(work, err) {
        debug('successfully updated work');
        res.send(work);
        return;
    }

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);
    queryData.work_data = _.pick(
        req.body, 'metadataGraph', 'state', 'visiblity');

    call(res, queryData, 'update_work', null, respond);
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
