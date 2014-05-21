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
var uris = require('./uris');
var requireUser = require('./sessions').requireUser;

/* Module global vars */
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

/* Internal functions defined later */
var deletePost,
    deleteSource,
    deleteWork,
    getCompleteWorkMetadata,
    getCurrentUser,
    getPost,
    getPostMetadata,
    getPostCEM,
    getPosts,
    getSource,
    getSourceCEM,
    getSourceMetadata,
    getStockSources,
    getUser,
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

exports.init = function init(app, localBackend, localCluster) {
    backend = localBackend;
    env = process.env;
    cluster = localCluster;

    // TODO: add request ID checking
    // TODO: add request sanity checking
};


exports.routes = function routes(app) {
    /* works */
    app.route('/works/:workID') 
        .get(getWork)
        .put(requireUser, putWork)
        // .patch(patchWork);
        .delete(requireUser, deleteWork);
    app.route('/works')
        .get(getWorks)
        .post(requireUser, postWork);
    app.get('/works/:workID/completeMetadata', getCompleteWorkMetadata);
    app.get('/works/:workID/metadata', getWorkMetadata);

    /* sources */
    app.route('/users/:userID/sources/:sourceID')
        .get(requireUser, getSource)
        .put(requireUser, putSource)
        // .patch(patchSource)
        .delete(requireUser, deleteSource);
    app.route('/users/:userID/sources')
        .get(requireUser, getStockSources)
        .post(requireUser, postStockSource);
    app.get('/users/:userID/sources/:sourceID/cachedExternalMetadata', requireUser, getSourceCEM);
    app.get('/users/:userID/sources/:sourceID/metadata', requireUser, getSourceMetadata);
   
    app.route('/works/:workID/sources/:sourceID')
        .get(getSource)
        .put(requireUser, putSource)
        // .patch(patchSource)
        .delete(requireUser, deleteSource);
    app.route('/works/:workID/sources')
        .get(getWorkSources)
        .post(requireUser, postWorkSource);
    app.get('/works/:workID/sources/:sourceID/cachedExternalMetadata', getSourceCEM);
    app.get('/works/:workID/sources/:sourceID/metadata', getSourceMetadata);

    /* posts */

    app.route('/works/:workID/posts/:postID')
        .get(getPost)
        .put(requireUser, putPost)
        .delete(requireUser, deletePost);
    app.route('/works/:workID/posts')
        .get(getPosts)
        .post(requireUser, postPost);
    app.get('/works/:workID/posts/:postID/cachedExternalMetadata', getPostCEM);
    app.get('/works/:workID/posts/:postID/metadata', getPostMetadata);

    /* sparql */
    app.get('/sparql', getSPARQL);

    /* Users */
    app.route('/users/current')
        .get(requireUser, getCurrentUser);

    app.route('/users/:userID')
        .get(getUser);
};



/* Add error handlers to a call promise to ensure proper HTTP
 * responses are sent.
 */
var handleErrors = function handleErrors(callPromise, res) {
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
};


/* Format boostrap data into a string that can be safely put into a script block
 *
 * Explanation here:
 * http://www.w3.org/TR/html5/scripting-1.html#restrictions-for-contents-of-script-elements
 */
var bootstrapData = function bootstrapData(data) {
    return JSON.stringify(data)
        .replace('<!--', '<\\!--')
        .replace('<script', '<\\script')
        .replace('</script', '<\\/script');
};

/* Helper method to return a result object correctly formatted.
 */
var formatResult = function formatResult(res, view) {
    return function(data) {
        res.format({
            'text/html': function(){
                res.render(view, {
                    data: data,

                    // Is there a prettier way to pass methods into render?
                    bootstrapData: bootstrapData,
                });
            },
            'application/json': function(){
                res.send(data);
            }
        });
    };
};

/* Basic data needed for all task calls.
 */
var commonData = function commonData (req) {
    var uid = req.session && req.session.uid;

    return {
        user_uri: uid ? uris.buildUserURI(uid) : null,
    };
};

/* Translate about:resource in the RDF/JSON metadata
 *  into the real resource URI for POST and PUT
 */
var updateMetadata = function updateMetadata(obj, uri) {
    if (obj.hasOwnProperty(createWorkSubject)) {
        if (obj.hasOwnProperty(uri)) {
            obj[uri] = _.extend(obj[uri], obj[createWorkSubject]);
        } else {
            obj[uri] = obj[createWorkSubject];
        }
        delete obj[createWorkSubject];
    }
};

/* API functions */

deleteWork = function deleteWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    handleErrors(
        backend.call('delete_work', queryData).
            then(function(data) {
                res.send(204, 'successfully deleted work');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res
    );
};

getPosts = function getPosts (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    handleErrors(
        backend.call('get_posts', queryData).
            then(formatResult(res, 'posts')),
        res);
};

getPost = function getPost (req, res) {
    var queryData = commonData(req);
    queryData.post_uri = uris.workPostURIFromReq(req);

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'workPost')),
        res);
};


postPost = function postPost(req, res) {
    var postURI;

    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    queryData.post_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    handleErrors(
        cluster.increment('next-post-id')
            .then(
                function(postID) {
                    postURI = uris.buildWorkPostURI(req.params.workID, postID);
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
};

putPost = function putPost(req, res) {
    var queryData = commonData(req);
    queryData.post_uri = uris.workPostURIFromReq(req);

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
};

deletePost = function deletePost (req, res) {
    var queryData = commonData(req);
    queryData.post_uri = uris.workPostURIFromReq(req);

    handleErrors(
        backend.call('delete_post', queryData).
            then(function(data) {
                res.send(204, 'successfully deleted post');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res);
};

getPostMetadata = function getPostMetadata (req, res) {
    var queryData = commonData(req);

    queryData.post_uri = uris.workPostURIFromReq(req);
    queryData.subgraph = 'metadata';

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'postMetadata')),
        res);
};

getPostCEM = function getPostCEM (req, res) {
    var queryData = commonData(req);

    queryData.post_uri = uris.workPostURIFromReq(req);
    queryData.subgraph = 'cachedExternalMetadata';

    handleErrors(
        backend.call('get_post', queryData).
            then(formatResult(res, 'postCEM')),
        res);
};


getSource = function getSource (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = uris.workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = uris.stockSourceURIFromReq(req);
    }

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'source')),
        res);
};

postWorkSource = function postWorkSource(req, res) {
    var sourceURI;

    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    queryData.source_data = {
        metadataGraph: req.body.metadataGraph || {},
        cachedExternalMetadataGraph: req.body.cachedExternalMetadataGraph || {},
        resource: req.body.resource,
    };

    handleErrors(
        cluster.increment('next-source-id')
            .then(
                function(sourceID) {
                    sourceURI = uris.buildWorkSourceURI(
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
};

postStockSource = function postStockSource(req, res) {
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
                    sourceURI = uris.buildStockSourceURI('test_1', sourceID);
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
};

putSource = function putSource(req, res) {
    var queryData = commonData(req);

    if (req.params.workID) {
        queryData.source_uri = uris.workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = uris.stockSourceURIFromReq(req);
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
};

deleteSource = function deleteSource (req, res) {
    var queryData = commonData(req);

    if (req.params.workID) {
        queryData.source_uri = uris.workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = uris.stockSourceURIFromReq(req);
    }

    handleErrors(
        backend.call('delete_source', queryData).
            then(function () {
                res.send(204, 'successfully deleted source');
                // TODO: this could be 202 Accepted if we add undo capability
            }),
        res);
};

getSourceMetadata = function getSourceMetadata (req, res) {
    var queryData = commonData(req);

    if (req.params.workID) {
        queryData.source_uri = uris.workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = uris.stockSourceURIFromReq(req);
    }

    queryData.subgraph = 'metadata';

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'sourceMetadata')),
        res);
};

getSourceCEM = function getSourceCEM (req, res) {
    var queryData = commonData(req);
    if (req.params.workID) {
        queryData.source_uri = uris.workSourceURIFromReq(req);
    }
    else {
        queryData.source_uri = uris.stockSourceURIFromReq(req);
    }

    queryData.subgraph = 'cachedExternalMetadata';

    handleErrors(
        backend.call('get_source', queryData).
            then(formatResult(res, 'sourceCEM')),
        res);
};

getWorkSources = function getWorkSources (req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    handleErrors(
        backend.call('get_work_sources', queryData).
            then(formatResult(res, 'sources')),
        res);
};

getStockSources = function getStockSources (req, res) {
    var queryData = commonData(req);

    handleErrors(
        backend.call('get_stock_sources', queryData).
            then(formatResult(res, 'sources')),
        res);
};


getWork = function getWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);

    handleErrors(
        backend.call('get_work', queryData).
            then(formatResult(res, 'workPermalink')),
        res);
};


getWorks = function getWorks(req, res) {
    var queryData = commonData(req);

    queryData.offset = req.query.offset || 0;
    queryData.limit = req.query.limit || 0;
    queryData.query = req.query;

    handleErrors(
        backend.call('query_works_simple', queryData).
            then(formatResult(res, 'works')),
        res);
};


getWorkMetadata = function getWorkMetadata(req, res) {
    var queryData = commonData(req);

    queryData.work_uri = uris.workURIFromReq(req);
    queryData.subgraph = "metadata";

    handleErrors(
        backend.call('get_work', queryData).
            then(formatResult(res, 'workMetadata')),
        res);
};


getCompleteWorkMetadata = function getCompleteWorkMetadata(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);
    queryData.format = 'json';

    handleErrors(
        backend.call('get_complete_metadata', queryData).
            then(formatResult(res, 'completeMetadata')),
        res);
};


postWork = function postWork(req, res) {
    var workURI;

    var queryData = commonData(req);
    queryData.work_data = {
        metadataGraph: req.body.metadataGraph || {},
        state: req.body.state || 'draft',
        visible: req.body.visible || 'private',
    };

    handleErrors(
        cluster.increment('next-work-id')
            .then(
                function(workID) {
                    workURI = uris.buildWorkURI(workID);
                    queryData.work_uri = workURI;
                    queryData.work_data.id = workID;
                    updateMetadata(queryData.work_data.metadataGraph, workURI);

                    return backend.call('create_work', queryData);
                }
            ).then(
                function(data) {
                    debug('successfully added work, redirecting to %s', workURI);
                    res.redirect(workURI);
                }
            ),
        res);
};


putWork = function putWork(req, res) {
    var queryData = commonData(req);
    queryData.work_uri = uris.workURIFromReq(req);
    queryData.work_data = _.pick(
        req.body, 'metadataGraph', 'state', 'visible');
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
};


getSPARQL = function getSPARQL(req, res) {
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
};


getUser = function getUser(req, res) {
    // TODO: get profile from frontend/backend

    var data = {
        id: req.params.userID,
        resource: uris.buildUserURI(req.params.userID)
    };

    // Include email when responding to ourselves
    if (req.params.userID === req.session.uid) {
            data.email = req.session.email;
    }

    res.send(data);
};


getCurrentUser = function getCurrentUser(req, res) {
    res.redirect(uris.buildUserURI(req.session.uid));
};
