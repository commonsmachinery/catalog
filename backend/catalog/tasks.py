# -*- coding: utf-8 -*-
#
# catalog - backend for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

from __future__ import absolute_import

import json, time

from celery import subtask
from catalog.celery import app, RedisLock, StoreTask, LockTimeoutError

from catalog.celery import on_create_work
from catalog.celery import on_update_work
from catalog.celery import on_delete_work
from catalog.celery import on_create_work_source
from catalog.celery import on_create_stock_source
from catalog.celery import on_update_source
from catalog.celery import on_delete_source
from catalog.celery import on_create_post
from catalog.celery import on_delete_post

from catalog.log import LogNotAvailable
from catalog.store import CatalogError, EntryNotFoundError

import logging
_log = logging.getLogger('catalog')


#
# main store update tasks
#

@app.task(base=StoreTask, bind=True)
def create_work(self, user, work_uri, work_data):
    try:
        with RedisLock(work_uri):
            timestamp = int(time.time())
            work_data = self.main_store.create_work(user, work_uri, work_data)

            log_data = json.dumps(work_data)
            log_event.apply_async(args=('create_work', timestamp, user, work_uri, None, log_data))

            on_create_work.send(sender=self, user=user, work_uri=work_uri, work_data=work_data)
            return work_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)


@app.task(base=StoreTask, bind=True)
def update_work(self, user, work_uri, work_data):
    try:
        with RedisLock(work_uri):
            timestamp = int(time.time())
            work_data = self.main_store.update_work(user, work_uri, work_data)

            log_data = json.dumps(work_data)
            log_event.apply_async(args=('update_work', timestamp, user, work_uri, None, log_data))

            on_update_work.send(sender=self, user=user, work_uri=work_uri, work_data=work_data)
            return work_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_work(self, user, work_uri):
    try:
        timestamp = int(time.time())
        self.main_store.delete_work(user, work_uri)

        log_event.apply_async(args=('delete_work', timestamp, user, work_uri, None, None))

        on_delete_work.send(sender=self, user=user, work_uri=work_uri)
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_work_source(self, user, work_uri, source_uri, source_data):
    try:
        timestamp = int(time.time())
        source_data = self.main_store.create_work_source(user, work_uri, source_uri, source_data)

        log_data = json.dumps(source_data)
        log_event.apply_async(args=('create_work_source', timestamp, user, work_uri, source_uri, log_data))

        on_create_work_source.send(sender=self, user=user, work_uri=work_uri, source_uri=source_uri, source_data=source_data)
        return source_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_stock_source(self, user, source_uri, source_data):
    try:
        timestamp = int(time.time())
        source_data = self.main_store.create_stock_source(user, source_uri, source_data)

        log_data = json.dumps(source_data)
        log_event.apply_async(args=('create_stock_source', timestamp, user, None, source_uri, log_data))

        on_create_stock_source.send(sender=self, user=user, source_uri=source_uri, source_data=source_data)
        return source_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def update_source(self, user, source_uri, source_data):
    try:
        timestamp = int(time.time())
        source_data = self.main_store.update_source(user, source_uri, source_data)

        log_data = json.dumps(source_data)
        log_event.apply_async(args=('update_source', timestamp, user, None, source_uri, log_data))

        on_update_source.send(sender=self, user=user, source_uri=source_uri, source_data=source_data)
        return source_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_source(self, user, source_uri):
    try:
        timestamp = int(time.time())
        self.main_store.delete_source(user, source_uri)

        log_event.apply_async(args=('delete_source', timestamp, user, None, source_uri, None))

        on_delete_source.send(sender=self, user=user, source_uri=source_uri)
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_post(self, user, work_uri, post_uri, post_data):
    try:
        timestamp = int(time.time())
        post_data = self.main_store.create_post(user, work_uri, post_uri, post_data)

        log_data = json.dumps(post_data)
        log_event.apply_async(args=('create_post', timestamp, user, work_uri, post_uri, log_data))

        on_create_post.send(sender=self, user=user, work_uri=work_uri, post_uri=post_uri, post_data=post_data)
        return post_data
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_post(self, user, post_uri):
    try:
        timestamp = int(time.time())
        self.main_store.delete_post(user, post_uri)

        log_event.apply_async(args=('delete_post', timestamp, user, None, post_uri, None))

        on_delete_post.send(sender=self, user=user, post_uri=post_uri)
    except CatalogError as e:
        return {'error': {'type': e.__class__.__name__, 'message': e.message}}
    except LockTimeoutError as e:
        raise self.retry(exc=e, countdown=1)

#
# public store update tasks
#

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_work(self, user, work_uri, work_data):
    self.public_store.create_work(user, work_uri, work_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_update_work(self, user, work_uri, work_data):
    self.public_store.update_work(user, work_uri, work_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_work(self, user, work_uri):
    try:
        self.public_store.delete_work(user, work_uri)
    except EntryNotFoundError:
        pass

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_work_source(self, user, work_uri, source_uri, source_data):
    self.public_store.create_work_source(user, work_uri, source_uri, source_data)

#@app.task(base=StoreTask, bind=True, ignore_result=True)
#def public_create_stock_source(self, user, source_uri, source_data):
#    self.public_store.create_stock_source(user, source_uri, source_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_update_source(self, user, source_uri, source_data):
    self.public_store.update_source(user, source_uri, source_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_source(self, user, source_uri, unlink=True):
    try:
        self.public_store.delete_source(user, source_uri)
    except EntryNotFoundError:
        pass

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_post(self, user, work_uri, post_uri, post_data):
    self.public_store.create_post(user, work_uri, post_uri, post_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_post(self, user, post_uri):
    try:
        self.public_store.delete_post(user, post_uri)
    except EntryNotFoundError:
        pass

#
# query tasks
#

@app.task(base=StoreTask, bind=True)
def get_work(self, user, work_uri, subgraph=None):
    store = self.main_store if user is not None else self.public_store
    return store.get_work(user, work_uri, subgraph)

@app.task(base=StoreTask, bind=True)
def get_work_sources(self, user, work_uri):
    store = self.main_store if user is not None else self.public_store
    return store.get_work_sources(user, work_uri)

@app.task(base=StoreTask, bind=True)
def get_stock_sources(self, user):
    store = self.main_store if user is not None else self.public_store
    return store.get_stock_sources(user)

@app.task(base=StoreTask, bind=True)
def get_source(self, user, source_uri, subgraph=None):
    store = self.main_store if user is not None else self.public_store
    return store.get_source(user, source_uri, subgraph)

@app.task(base=StoreTask, bind=True)
def get_post(self, user, post_uri, subgraph=None):
    store = self.main_store if user is not None else self.public_store
    return store.get_post(user, post_uri, subgraph)

@app.task(base=StoreTask, bind=True)
def get_posts(self, user, work_uri):
    store = self.main_store if user is not None else self.public_store
    return store.get_posts(work_uri)

@app.task(base=StoreTask, bind=True)
def get_complete_metadata(self, user, work_uri, format='json'):
    store = self.main_store if user is not None else self.public_store
    return store.get_complete_metadata(user, work_uri, format)

@app.task(base=StoreTask, bind=True)
def query_works_simple(self, user, **kwargs):
    store = self.main_store if user is not None else self.public_store
    return store.query_works_simple(user, **kwargs)

@app.task(base=StoreTask, bind=True)
def query_sparql(self, query_string=None, results_format='json'):
    store = self.public_store
    return store.query_sparql(query_string, results_format)

@app.task(base=StoreTask, bind=True, ignore_result=True, max_retries=None, default_retry_delay=15)
def log_event(self, type, time, user, work, entry, data):
    try:
        self.log.log_event(type, time, user, work, entry, data)
    except LogNotAvailable as e:
        raise self.retry(exc=e)

@app.task(base=StoreTask, bind=True)
def query_events(self, type=None, user=None, time_min=None, time_max=None, resource=None, limit=100, offset=0):
    return self.log.query_events(type, user, time_min, time_max, resource, limit, offset)


@on_create_work.connect
@on_update_work.connect
@on_delete_work.connect
@on_create_work_source.connect
@on_create_stock_source.connect
@on_update_source.connect
@on_delete_source.connect
@on_create_post.connect
@on_delete_post.connect
def on_work_updated(sender=None, user=None, work_uri=None, work_data=None,
                    source_uri=None, source_data=None, post_uri=None, post_data=None, **kwargs):
    task = sender
    if sender == create_work:
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_work.delay(user=user, work_uri=work_uri, work_data=work_data)

    elif sender == update_work:
        visibility = work_data.get('visibility')
        if visibility == 'public':
            try:
                task.public_store.get_work(user, work_uri)
                public_update_work.delay(user=user, work_uri=work_uri, work_data=work_data)
            except EntryNotFoundError:
                public_create_work.delay(user=user, work_uri=work_uri, work_data=work_data)

    elif sender == delete_work:
        public_delete_work.delay(user=user, work_uri=work_uri)

    elif sender == create_work_source:
        work_data = task.main_store.get_work(user=user, work_uri=work_uri)
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_work_source.delay(user=user, work_uri=work_uri, source_uri=source_uri, source_data=source_data)

    elif sender == create_stock_source:
        #public_create_stock_source.delay(user=user, source_uri=source_uri, source_data=source_data)
        pass

    elif sender == update_source:
        if work_uri:
            work_data = task.main_store.get_work(user=user, work_uri=work_uri)
            if visibility == 'public':
                public_update_source.delay(user=user, source_uri=source_uri, source_data=source_data)

    elif sender == delete_source:
        public_delete_source.delay(user=user, source_uri=source_uri)

    elif sender == create_post:
        work_data = task.main_store.get_work(user=user, work_uri=work_uri)
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_post.delay(user=user, post_uri=post_uri, post_data=post_data)

    elif sender == delete_post:
        public_delete_post.delay(user=user, post_uri=post_uri)
