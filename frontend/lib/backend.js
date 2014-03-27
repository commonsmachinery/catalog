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
        var options, result;

        options = {};

        // TODO: proper logging
        debug('calling %s: %j', name, params);

        result = self._client.call(
            'catalog.tasks.' + name,
            params, options);

        // TODO: timeout handling

        // TODO: listen on client for errors?  But then it will be
        // difficult to determine which task caused it.  On the other
        // hand, such errors probably signal that the broker is dead
        // and all current tasks should fail...  To be tested.

        result.on('ready', function(message) {
            result.removeAllListeners();

            if (message.status === 'SUCCESS') {
                debug('result of %s: %j', name, message.result);

                if (message.result.error) {
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
                // proper .error()/.catch() treatment.  For some
                // reason just throwing here won't be treated as a rejection.
                resolve(Promise.try(function() {
                    throw(new BackendError(util.format(
                        'backend %s: %s',
                        message.status,
                        message.result.exc_message)));
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