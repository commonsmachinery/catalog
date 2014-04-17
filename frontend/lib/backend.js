/* Catalog web/REST frontend - Backend interface

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors:
        Peter Liljenberg <peter@commonsmachinery.se>
        Elsa Balderrama <elsa@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
*/

'use strict';

var debug = require('debug')('frontend:backend');
var util = require('util');
var celery = require('node-celery');
var Promise = require('bluebird');

/* Call timeout - no real need to make this configurable */
var gCallTimeoutSecs = 15;


/* Exceptions thrown on timeouts, connection errors or exceptions
 * coming from the backend itself.
 */
function BackendError(message) {
    this.message = message;
    this.name = "BackendError";
    Error.captureStackTrace(this, BackendError);
}
BackendError.prototype = Object.create(Error.prototype);
BackendError.prototype.constructor = BackendError;

exports.BackendError = BackendError;


/* Backend interface for calling tasks in the backend.  Handles
 * timeouts, logging, etc.  Not exposed directly to the user, must be
 * created by calling connect()
 */
function Backend(client) {
    this._client = client;

    // We must have an event handler for error, otherwise the server
    // will die if the broker fails.
    client.on('error', function(e) {
        debug('celery error: %j', e);
    });
}


/* Invoke the task name, appending the catalog.tasks. prefix, passing
 * it params.
 *
 * Returns a Bluebird Promise, that resolves with the returned result
 * from the task.
 *
 * If the task returns an error object the promise will be * rejected
 * with that object.  It is recommended to catch this with an .error()
 * handler rather than a rejection handler on .then(), since then you
 * don't have to check if it might be an exception instead.  These
 * should generally result in a HTTP 4xx response.
 *
 * Any failures, including timeouts, connection errors or exceptions
 * thrown from the backend will be thrown as BackendError exceptions.
 * They can be caught with .catch(BackendError, ...) and should
 * generally result in a HTTP 503 response.  Anything else should be a
 * HTTP 500.
 */
Backend.prototype.call = function(name, params) {
    var self = this;

    return new Promise(function(resolve, reject) {
        var options, result, timeout;

        options = {};

        // TODO: proper logging
        debug('calling %s: %j', name, params);

        try {
            // TODO: extend celery call() method to allow us to
            // tighten up the call.  We should specify mandatory,
            // immediate, deliveryMode and expiration to avoid
            // clogging up the queue on backend problems.  This might
            // also/alternatively be reflected in the celery message
            // options here.

            result = self._client.call(
                'catalog.tasks.' + name,
                params, options);
        }
        catch (e) {
            // Refine this into a BackendError to get a 503
            console.error('celery error when calling %s: %s', name, e);
            throw new BackendError(util.format(
                'celery error when calling %s: %s', name, e));
        }


        // We let the timeout handle all kinds of network and amqp
        // errors, since the amqp client library will try to reconnect
        // if it loses the connection.

        timeout = setTimeout(function() {
            // There's no support to cancel a Celery call in
            // node-celery at the moment, so just stop listening
            result.removeAllListeners();

            console.error('timeout calling %s', name);

            // We need to throw this within a promise to get the
            // proper .error()/.catch() treatment since we're in a
            // callback.
            resolve(Promise.try(function() {
                throw new BackendError(util.format(
                    'calling %s: timeout waiting for response',
                    name));
            }));
        }, gCallTimeoutSecs * 1000);

        result.on('ready', function(message) {
            // Avoid resolving more than once
            result.removeAllListeners();
            clearTimeout(timeout);

            if (message.status === 'SUCCESS') {
                debug('result of %s: %j', name, message.result);

                if (message.result && message.result.error) {
                    // Expected errors such as access violations,
                    // resource not found etc
                    reject(message.result.error);
                }
                else {
                    resolve(message.result);
                }
            }
            else {
                console.error('backend task %s failed: %j', name, message);

                // We need to throw this within a promise to get the
                // proper .error()/.catch() treatment since we're in a
                // callback.
                resolve(Promise.try(function() {
                    throw new BackendError(util.format(
                        'calling %s: %s: %s',
                        name,
                        message.status,
                        message.result.exc_message));
                }));
            }
        });
    });
};


/* Connect to the backend using the AMQP broker at brokerURL.
 *
 * Returns a promise that resolves to a Backend object, or is rejected
 * with an error message if the broker is unavailable.
 */
exports.connect = function connect(brokerURL) {
    return new Promise(function(resolve, reject) {
        var client = celery.createClient({
                CELERY_BROKER_URL: brokerURL,
                CELERY_RESULT_BACKEND: 'amqp',
                CELERY_TASK_RESULT_EXPIRES: 30,
                CELERY_TASK_RESULT_DURABLE: false
            });

        // Be careful to remove listeners once we've resolved or
        // rejected to not call them more than once

        client.on('connect', function() {
            debug('Connected to celery');
            client.removeAllListeners();
            resolve(new Backend(client));
        });

        client.on('error', function(err) {
            console.log('celery connection error: %s', err);
            client.removeAllListeners();
            reject(err);
        });
    });
};