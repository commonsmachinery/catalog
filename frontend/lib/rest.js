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
var baseURL;

var cudCallOptions = { };

function rest(app, localBackend, localBaseURL) {
    backend = localBackend;
    baseURL = localBaseURL;

    // TODO: add request ID checking
    // TODO: add request sanity checking

    app.get('/works', getWorks);
    app.get('/works/:workID', getWork);
    app.post('/works', postWork);
    app.put('/works/:workID', putWork);
    app.delete('/works/:workID', deleteWork);

    return;
};


function buildURL() {
    return baseURL + '/' + Array.prototype.join.call(arguments, '/');
}

function deleteWork(req, res) {
    function sendResponse (work, err) {
        /* ToDo: Send response code only, let the client handle which message to display */
        if (err) {
            console.log(err);
            res.send(500, 'Error deleting work');
            return;
        }
        if (!work) {
            res.send(404);
            return;
        }
        // TODO: this could be 202 Accepted if we add undo capability
        res.send(204, 'successfully deleted work'); 
    }
    var user = 'test';

    // TODO: do sanitychecking on the ID
    var queryData =  {
        id: req.params.workID,
        user: user,
    };
    var result = backend.call('catalog_backend.delete_work', queryData, cudCallOptions);
    handleBackendResult(result, sendResponse);
}

function getWork(req, res) {
    function gotoWork(work, err) {
        /* ToDo: Send response code only, let the client handle which message to display */
        if (err) {
            if (err.exception === 'WorkNotFound') {
                res.send(404, 'Work not found');
            }
            else {
                res.send(500, 'Error processing event');
            }
            return;
        }
        res.format({
            'text/html': function(){
                console.log(work);
                res.render('workPermalink',{
                    work: work
                })
            },
            'application/json': function(){
                res.send(work)
            }
        });
        return;
    }

    // TODO: do sanitychecking on the ID
    var user;
    var result;
    var queryData;

    user = 'test';
    var queryData =  {
        id: req.params.workID,
        user: user,
    };
    var result = backend.call('catalog_backend.get_work', queryData, cudCallOptions);
    handleBackendResult(result, gotoWork);
    return;
}

function getWorks(req, res) {
    function sendResult (works, err) {
        if (err) {
            console.error(err);
            res.send(500, 'Error fetching list of works');
            return;
        }
        res.format({
            'text/html': function() {
                res.render('workCollection', {
                    works: works
                });
            },
            'application/json': function() {
                res.send(works);
            }
        });
        return;
    }
    var user = 'test';
    var queryData = req.query;

    queryData.user = user;

    var result = backend.call('catalog_backend.get_works', queryData, cudCallOptions);
    handleBackendResult(result, sendResult);
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
    function gotoWork(work, err) {
        var workURL;

        /* ToDo: Send response code only, let the client handle which message to display */
        if (err) {
            res.send(500, 'Error processing event: ', err);
            return;
        }
        workURL = buildURL('works', work.id);
        debug('successfully added work, redirecting to %s', workURL);
        res.redirect(workURL);
    }
    var user;
    var result;
    var queryData;

    user = 'test';
    var workData = {
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        timestamp: Date.now(),
        user: user,
        visibility: req.body.visibility,
    };
    var result = backend.call('catalog_backend.create_work', workData, cudCallOptions);
    handleBackendResult(result, gotoWork);
    return;
}

function putWork(req, res) {
    function sendResult (work, err) {
        /* ToDo: Send response code only, let the client handle which message to display */
        if (err) {
            console.log(err);
            res.send(500, 'Error updating work');
            return;
        }

        debug('successfully updated work');
        res.send('success');
        return;
    }

    var user = 'test';

    // TODO: do sanitychecking on the ID
    var workData = {
        id: req.params.workID,
        metadataGraph: req.body.metadataGraph,
        state: req.body.state,
        time: Date.now(),
        user: user,
        visibility: req.body.visibility,
    };

    /* ToDo: make 'global' */
    // var validWorkVisibility = [
    //     'public',
    //     'private',
    //      'group'
    // ];
    // var validWorkState = [
    //     'published',
    //     'draft'
    // ];

    /* Should this be validated in here and not on the backend? */
    // if (validWorkVisibility.indexOf(req.body.visibility) < 0) {
    //     res.send('error: invalid work visibility setting');
    //     return
    // }
    // if (validWorkState.indexOf(req.body.state) < 0) {
    //     res.send('error: invalid work state setting');
    //     return
    // }

    var result = backend.call('catalog_backend.update_work', workData, cudCallOptions);
    handleBackendResult(result, sendResult);
    return;
}

module.exports = rest;
