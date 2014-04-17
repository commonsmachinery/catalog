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

var backend;
var env;
var cluster;

// TODO: this should perhaps go into a json file instead
var errorMap = {
    'ParamError': 400,
    'EntryAccessError': 403,
    'EntryNotFoundError': 404,
};

var createWorkSubject = "about:resource";

/* API functions */
var deletePost,
    deleteSource,
    deleteWork,
    getCompleteWorkMetadata,
    getPost,
    getPostMetadata,
    getPostCEM,
    getPosts,
    getSource,
    getSourceCEM,
    getSourceMetadata,
    getStockSources,
    getWork,
    getWorkMetadata,
    getWorkSources,
    getSPARQL,
    getWorks,
    postPost,
    postStockSource,
    postWork,
    postWorkSource,
    putPost,
    putSource,
    putWork;

function rest(app, localBackend, localCluster) {
    backend = localBackend;
    env = process.env;
    cluster = localCluster;

    // TODO: add request ID checking
    // TODO: add request sanity checking

    /* works */
    app.delete('/works/:workID', deleteWork);
    app.get('/works', getWorks);
    app.get('/works/:workID', getWork);
    app.get('/works/:workID/completeMetadata', getCompleteWorkMetadata);
    app.get('/works/:workID/metadata', getWorkMetadata);
    // app.patch('/works/:workID', patchWork);
    app.post('/works', postWork);
    app.put('/works/:workID', putWork);

    /* sources */
    app.delete('/users/:userID/sources/:sourceID', deleteSource);
    app.get('/users/:userID/sources', getStockSources);
    app.get('/users/:userID/sources/:sourceID', getSource);
    app.get('/users/:userID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/users/:userID/sources/:sourceID/metadata', getSourceMetadata);
    // app.patch('/users/:userID/sources/:sourceID', patchSource);
    app.post('/users/:userID/sources', postStockSource);
    app.put('/users/:userID/sources/:sourceID', putSource);

    app.delete('/works/:workID/sources/:sourceID', deleteSource);
    app.get('/works/:workID/sources', getWorkSources);
    app.get('/works/:workID/sources/:sourceID', getSource);
    app.get('/works/:workID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/works/:workID/sources/:sourceID/metadata', getSourceMetadata);
    // app.patch('/works/:workID/sources/:sourceID', patchSource);
    app.post('/works/:workID/sources', postWorkSource);
    app.put('/works/:workID/sources/:sourceID', putSource);

    /* posts */
    app.delete('/works/:workID/posts/:postID', deletePost);
    app.get('/works/:workID/posts', getPosts);
    app.get('/works/:workID/posts/:postID', getPost);
    app.get('/works/:workID/posts/:postID/cachedExternalMetadata', getPostCEM);
    app.get('/works/:workID/posts/:postID/metadata', getPostMetadata);
    app.post('/works/:workID/posts', postPost);
    app.put('/works/:workID/posts/:postID', putPost);

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
        return buildStockSourceURI('test_1', req.params.sourceID);
    }

    throw new Error('missing sourceID param');
}



/* Add error handlers to a call promise to ensure proper HTTP
 * responses are sent.
 */
function handleErrors(callPromise, res) {
    callPromise.
        error(function(error) {
            res.send(errorMap[error.type] || 500, error);
        }).
        catch(BackendError, function(e) {
            // It's already been logged
            res.send(503, env.NODE_ENV === 'production' ? 'Temporary internal error\n' : e.message + '\n');
        }).
        catch(function(e) {
            console.error('exception when calling task: %s', e.stack);
            res.send(500, env.NODE_ENV === 'production' ? 'Internal error\n' : e.stack);
        }).
        done();
}

/* Helper method to return a result object correctly formatted.
 */
function formatResult(res, view) {
    return function(data) {
        // TODO: owner should really be returned from the backend
        var owner = false;

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
    };
}

/* Basic data needed for all task calls.
 */
function commonData (req) { 
    var user_uri = buildUserURI('test_1');

    return {
        user_uri: user_uri,
    };
}

/* Translate about:resource in the RDF/JSON metadata
 *  into the real resource URI for POST and PUT
 */
function updateMetadata(obj, uri) {
    if (obj.hasOwnProperty(createWorkSubject)) {
        if (obj.hasOwnProperty(uri)) {
            obj[uri] = _.extend(obj[uri], obj[createWorkSubject]);
        } else {
            obj[uri] = obj[createWorkSubject];
        }
        delete obj[createWorkSubject];
    }
}

/* API functions */

function deleteWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    handleErrors(
        backend.call('delete_work', queryData).
            then(function(data) {
                res.send(204, 'successfully deleted work');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res
    );
}

function getPosts (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    handleErrors(
        backend.call('get_posts', queryData).
            then(formatResult(res, 'posts')),
        res);
}

function getPost (req, res) {
    var queryData = commonData(req);
    queryData.post_uri = workPostURIFromReq(req);

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'workPost')),
        res);
}


function postPost(req, res) {
    var postURI;

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    queryData.post_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    handleErrors(
        cluster.increment('next-post-id')
            .then(
                function(postID) {
                    postURI = buildWorkPostURI(req.params.workID, postID);
                    queryData.post_uri = postURI;
                    queryData.post_data.id = postID;
                    updateMetadata(queryData.post_data.metadataGraph, postURI);

                    return backend.call('create_post', queryData);
                }
            ).then(
                function(data) {
                    debug('successfully added post, redirecting to %s', postURI);
                    res.redirect(postURI);
                }
            ),
        res);
}

function putPost(req, res) {
    var queryData = commonData(req);
    queryData.post_uri = workPostURIFromReq(req);

    queryData.post_data = _.pick(
        req.body, 'metadataGraph', 'cachedExternalMetadataGraph', 'resource');
    if (queryData.post_data.metadataGraph) {
        updateMetadata(queryData.post_data.metadataGraph, queryData.post_uri);
    }

    handleErrors(
        backend.call('update_post', queryData).
            then(function (data) {
                debug('successfully updated post');
                res.send(data);
            }),
        res);
}

function deletePost (req, res) {
    var queryData = commonData(req);
    queryData.post_uri = workPostURIFromReq(req);

    handleErrors(
        backend.call('delete_post', queryData).
            then(function(data) {
                res.send(204, 'successfully deleted post');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res);
}

function getPostMetadata (req, res) {
    var queryData = commonData(req);

    queryData.post_uri = workPostURIFromReq(req);
    queryData.subgraph = 'metadata';

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'postMetadata')),
        res);
}

function getPostCEM (req, res) {
    var queryData = commonData(req);

    queryData.post_uri = workPostURIFromReq(req);
    queryData.subgraph = 'cachedExternalMetadata';

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'postCEM')),
        res);
}


function getSource (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'source')),
        res);
}

function postWorkSource(req, res) {
    var sourceURI;

    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    queryData.source_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    handleErrors(
        cluster.increment('next-source-id')
            .then(
                function(sourceID) {
                    sourceURI = buildWorkSourceURI(
                        req.params.workID, sourceID);
                    queryData.source_uri = sourceURI;
                    queryData.source_data.id = sourceID;
                    updateMetadata(queryData.source_data.metadataGraph, sourceURI);

                    return backend.call('create_work_source', queryData);
                }
            ).then(
                function(data) {
                    debug('successfully added work source, redirecting to %s',
                          sourceURI);
                    res.redirect(sourceURI);
                }
            ),
        res);
}

function postStockSource(req, res) {
    var sourceURI;
    var queryData = commonData(req);

    queryData.source_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    handleErrors(
        cluster.increment('next-source-id')
            .then(
                function(sourceID) {
                    sourceURI = buildStockSourceURI('test_1', sourceID);
                    queryData.source_uri = sourceURI;
                    queryData.source_data.id = sourceID;
                    updateMetadata(queryData.source_data.metadataGraph, sourceURI);

                    return backend.call('create_stock_source', queryData);
                }
            ).then(
                function (data) {
                    debug('successfully added work source, redirecting to %s', sourceURI);
                    res.redirect(sourceURI);
                }
            ),
        res);
}

function putSource(req, res) {
    var queryData = commonData(req);

    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    queryData.source_data = _.pick(
        req.body, 'metadataGraph', 'cachedExternalMetadataGraph', 'resource');
    if (queryData.source_data.metadataGraph) {
        updateMetadata(queryData.source_data.metadataGraph, queryData.source_uri);
    }

    handleErrors(
        backend.call('update_source', queryData).
            then(function (data) {
                debug('successfully source work');
                res.send(data);
            }),
        res);
}

function deleteSource (req, res) {
    var queryData = commonData(req);

    if (req.params.workID) {
        queryData.source_uri = workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = stockSourceURIFromReq(req);
    }

    handleErrors(
        backend.call('delete_source', queryData).
            then(function (data) {
                res.send(204, 'successfully deleted source');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res);
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

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'sourceMetadata')),
        res);
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

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'sourceCEM')),
        res);
}

function getWorkSources (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    handleErrors(
        backend.call('get_work_sources', queryData).
            then(formatResult(res, 'sources')),
        res);
}

function getStockSources (req, res) {
    var queryData = commonData(req);

    handleErrors(
        backend.call('get_stock_sources', queryData).
            then(formatResult(res, 'sources')),
        res);
}


function getWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);

    handleErrors(
        backend.call('get_work', queryData).
            then(formatResult(res, 'workPermalink')),
        res);
}


function getWorks(req, res) {
    var queryData = commonData(req);

    queryData.offset = req.query.offset || 0;
    queryData.limit = req.query.limit || 0;
    queryData.query = req.query;

    handleErrors(
        backend.call('query_works_simple', queryData).
            then(formatResult(res, 'works')),
        res);
}


function getWorkMetadata(req, res) {
    var queryData = commonData(req);

    queryData.work_uri = workURIFromReq(req);
    queryData.subgraph = "metadata";

    handleErrors(
        backend.call('get_work', queryData).
            then(formatResult(res, 'workMetadata')),
        res);
}


function getCompleteWorkMetadata(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = workURIFromReq(req);
    queryData.format = 'json';

    handleErrors(
        backend.call('get_complete_metadata', queryData).
            then(formatResult(res, 'completeMetadata')),
        res);
}


function postWork(req, res) {
    var workURI;

    var queryData = commonData(req);
    queryData.work_data = {
        metadataGraph: req.body.metadataGraph || {},
        state: req.body.state || 'draft',
        visibility: req.body.visibility || 'private',
    };

    handleErrors(
        cluster.increment('next-work-id')
            .then(
                function(workID) {
                    workURI = buildWorkURI(workID);
                    queryData.work_uri = workURI;
                    queryData.work_data.id = workID;
                    updateMetadata(queryData.work_data.metadataGraph, workURI);

                    return backend.call('create_work', queryData);
                }
            ).then(
                function respond(data) {
                    debug('successfully added work, redirecting to %s', workURI);
                    res.redirect(workURI);
                }
            ),
        res);
}


function putWork(req, res) {
    var queryData = commonData(req);

    queryData.work_uri = workURIFromReq(req);
    queryData.work_data = _.pick(
        req.body, 'metadataGraph', 'state', 'visiblity');
    if (queryData.work_data.metadataGraph) {
        updateMetadata(queryData.work_data.metadataGraph, queryData.work_uri);
    }

    handleErrors(
        backend.call('update_work', queryData).
            then(function(data) {
                debug('successfully updated work');
                res.send(data);
            }),
        res);
}


function getSPARQL(req, res) {
    var results_format;

    if (req.get('Accept') === "application/json") {
        results_format = "json";
    } else {
        results_format = "xml";
    }

    var queryData = {
        query_string: req.query.query,
        results_format: results_format
    };

    handleErrors(
        backend.call('query_sparql', queryData).
            then(function(data) {
                res.send(data);
            }),
        res);
}

module.exports = rest;
