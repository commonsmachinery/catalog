# -*- coding: utf-8 -*-
#
# log - event log for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

import os
import sqlite3

import pymongo
from pymongo import MongoClient

import logging
_log = logging.getLogger("catalog")

class LogNotAvailable(Exception): pass

class SqliteLog(object):
    def __init__(self, dir):
        try:
            self._conn = sqlite3.connect(os.path.join(dir, 'events.sqlite'))
            self._cur = self._conn.cursor()

            self._cur.execute("create table if not exists events (type, time, user, resource, data)")
        except sqlite3.DatabaseError, e:
            raise LogNotAvailable('error opening sqlite db: %s' % e)


    def log_event(self, type, time, user, resource, data):
        try:
            self._cur.execute("insert into events values (?, ?, ?, ?, ?)", (type, time, user, resource, data))
            self._conn.commit()
        except sqlite3.DatabaseError, e:
            raise LogNotAvailable('error storing event: %s' % e)


    def query_events(self, type=None, time_min=None, time_max=None, user=None, resource=None, limit=100, offset=0):
        where_keys = []
        where_values = []
        if type:
            where_keys.append("type=?")
            where_values.append(type)
        if time_min:
            where_keys.append("time>=?")
            where_values.append(time_min)
        if time_max:
            where_keys.append("time<=?")
            where_values.append(time_max)
        if user:
            where_keys.append("user=?")
            where_values.append(user)
        if resource:
            where_keys.append("resource=?")
            where_values.append(resource)
        if len(where_keys) > 0:
            query = "SELECT * FROM events WHERE %s LIMIT %d OFFSET %d" % (" and ".join(where_keys), limit, offset)
            self._cur.execute(query, tuple(where_values))
        else:
            query = "SELECT * FROM events LIMIT %d OFFSET %d" % (limit, offset)
            self._cur.execute(query)

        events = []
        for row in self._cur:
            type, time, user, resource, payload = row
            event = {
                'type': type,
                'time': time,
                'user': user,
                'resource': resource,
                'payload': payload,
            }
            events.append(event)
        return events

class MongoDBLog(object):
    def __init__(self, url, database):
        try:
            self._client = MongoClient(url)
            self._db = self._client[database]
            self._events = self._db.events

            self._events.ensure_index("user")
            self._events.ensure_index("resource")
            self._events.ensure_index([("resource", pymongo.ASCENDING), ("time", pymongo.ASCENDING)])
        except pymongo.errors.PyMongoError as e:
            raise LogNotAvailable('error connecting to MongoDB: %s' % e)

    def log_event(self, type, time, user, resource, data):
        event = {
            'type': type,
            'time': time,
            'user': user,
            'resource': resource,
            'payload': data,
        }
        try:
            self._events.insert(event)
        except pymongo.errors.PyMongoError as e:
            raise LogNotAvailable('error storing event: %s' % e)

    def query_events(self, type=None, time_min=None, time_max=None, user=None, resource=None, limit=100, offset=0):
        spec = {}
        if type:
            spec["type"] = type
        if user:
            spec["user"] = user
        if resource:
            spec["resource"] = resource
        if time_min or time_max:
            spec["time"] = {}
            if time_min:
                spec["time"]["$gte"] = time_min
            if time_max:
                spec["time"]["$lte"] = time_min
        cursor = self._events.find(spec=spec, skip=offset, limit=limit)
        return [obj for obj in cursor]
