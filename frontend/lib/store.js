/* Catalog web/REST frontend - Event frontend store and processing

   Copyright 2014 Commons Machinery http://commonsmachinery.se/

   Authors: Peter Liljenberg <peter@commonsmachinery.se>

   Distributed under an AGPL_v3 license, please see LICENSE in the top dir.
  */

'use strict';

var debug = require('debug')('frontend:store');
var _ = require('underscore');

var workProperties = [
    'id',
    'resource',
    'metadata',
    'created',
    'creator',
    'updated',
    'updatedBy',
    'visibility',
    'state'
];

var workCreated = function workCreated(redis, event, callback) {
    // Store work into a bunch of tables
    var work = event.data;
    
    debug('processing WorkCreated: %j', event);

    // TODO: this should be a hsetnx on each property, or we should
    // change all this into a Lua script that checks that the work
    // doesn't yet exist.

    redis.multi()
        .hmset('work:' + work.id, _.pick(work, workProperties))
        .zadd('works.by.date', work.created, work.id)
        .exec(function(err, res) {
            if (err) {
                callback('error processing WorkCreated event:\n' + err.join('\n'), event);
                return;
            }

            callback(null, event);
        });
};

var eventProcessors = {
    'WorkCreated': workCreated,
};

exports.addEvent = function addEvent(redis, event, callback) {
    var processor = eventProcessors[event.type];

    if (!processor) {
        callback('unknown event type: ' + event.type, event);
        return;
    }

    // TODO: perhaps getting event ID and storing event should be an
    // atomical operation, but this is good enough for now.

    redis.incr('next.event.id', function(err, eventID) {
        if (err) {
            callback('error getting event ID: ' + err, event);
            return;
        }
        
        event.id = eventID;
        debug('adding event: %j', event);
        
        redis.rpush('events', JSON.stringify(event), function(err, result) {
            if (err) {
                callback('error storing event: ' + err, event);
                return;
            }

            processor(redis, event, callback);
        });
    });
};


exports.getWork = function getWork(redis, workID, callback) {
    // TODO: handle missing works

    redis.hmget('work:' + workID, workProperties, function(err, res) {
        if (err) {
            callback(err);
            return;
        }

        debug('%j', res);
        callback(null, _.object(workProperties, res));
    });
};