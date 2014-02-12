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
    
    debug('workCreated processing: %j', event);

    // TODO: this should be a hsetnx on each property, or we should
    // change all this into a Lua script that checks that the work
    // doesn't yet exist.

    redis.multi()
        .hmset('work:' + work.id, _.pick(work, workProperties))
        .zadd('works.by.date', work.created, work.id)
        .exec(function(err, res) {
            if (err) {
                callback('workCreated: error processing event:\n' + err.join('\n'), event);
                return;
            }

            callback(null, event);
        });
};

var workUpdated = function workUpdated(redis, event, callback) {
    // Store work into a bunch of tables
    var work = event.data;

    debug('workUpdated processing: %j', event);

    redis.hmset('work:' + work.id, _.pick(work, workProperties), function(err, res) {
        if (err) {
            callback('workUpdated: error processing event: ' + err, event);
            return;
        }

        callback(null, event);
    });
};

var workDeleted = function workDeleted(redis, event, callback) {
    var work = event.data;

    debug('workDeleted processing: %j', event);

    redis.multi()
        .del('work:' + work.id)
        .zrem('works.by.date', work.id)
        .exec(function(err, res) {
            if (err) {
                callback('workUpdated: error processing event:\n' + err.join('\n'), event);
                return;
            }

            callback(null, event);
        });
};

var eventProcessors = {
    'catalog.work.created': workCreated,
    'catalog.work.updated': workUpdated,
    'catalog.work.deleted': workDeleted,
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
        
        redis.lpush('events', JSON.stringify(event), function(err, result) {
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

        callback(null, _.object(workProperties, res));
    });
};

//
// Send event queue to backend
//

var eventQueueSender = function eventQueueSender(redis, celery) {
    debug('blocking on events list');
    redis.brpop('events', 0, function(err, res) {
        var event;

        if (err) {
            console.error('error reading events, sleeping a while: %s', err);
            setTimeout(function() { eventQueueSender(redis, celery); }, 5000);
            return;
        }

        event = JSON.parse(res[1]);

        debug('sending event to backend: %j', event);
        celery.call('catalog_backend.event', { event: event }, {}, function (result) {
            debug('got response from backend: %j', result);
        });

        eventQueueSender(redis, celery);
    });
};

exports.eventQueueSender = eventQueueSender;