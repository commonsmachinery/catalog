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

import json
from celery import subtask
from catalog.celery import app, FileLock, StoreTask, on_work_updated


@app.task(base=StoreTask, bind=True)
def create_work(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work = store.store_work(**kwargs)

    time = kwargs['timestamp']
    user = kwargs['user']
    resource = work['resource']
    #payload = json.dumps(kwargs)
    payload = json.dumps(work.get_data())

    log_event.apply_async(args=('create_work', time, user, resource, payload))
    if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

    return work.get_data()

@app.task(base=StoreTask, bind=True)
def update_work(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    id = kwargs['id']

    with FileLock(id):
        work = store.update_work(**kwargs)

        time = kwargs['time'] # as in rest.js
        user = kwargs['user']
        resource = work['resource']
        payload = json.dumps(work.get_data())

        log_event.apply_async(args=('update_work', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return work.get_data()

@app.task(base=StoreTask, bind=True)
def delete_work(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    id = kwargs['id']

    with FileLock(id):
        # here we temporarily get the resource to properly
        # log delete events. TODO: update this when accessing works by URL is implemented
        work = store.get_work(user=kwargs['user'], id=kwargs['id'])

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = work['resource']
        payload = None

        log_event.apply_async(args=('delete_work', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return kwargs

@app.task(base=StoreTask, bind=True)
def get_work(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_work(**kwargs)

@app.task(base=StoreTask, bind=True)
def get_works(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.query_works_simple(**kwargs)

# sources of works

@app.task(base=StoreTask, bind=True)
def add_source(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work_id = kwargs.get('work_id', None)

    if work_id:
        with FileLock(work_id):
            source = store.store_source(**kwargs)
            # here we temporarily get the resource to properly
            # log delete events. TODO: update this when accessing works by URL is implemented
            work = store.get_work(user=kwargs['user'], id=kwargs['work_id'])

            time = kwargs['timestamp']
            user = kwargs['user']
            resource = work['resource']
            payload = json.dumps(source.get_data())

            log_event.apply_async(args=('add_source', time, user, resource, payload))
            if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

            return source.get_data()
    else:
        source = store.store_source(**kwargs)

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = None
        payload = json.dumps(source.get_data())

        log_event.apply_async(args=('add_source', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return source.get_data()

@app.task(base=StoreTask, bind=True)
def get_source(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_source(**kwargs)

@app.task(base=StoreTask, bind=True)
def get_sources(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_sources(**kwargs)

@app.task(base=StoreTask, bind=True)
def update_source(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work_id = kwargs.get('work_id', None)

    if work_id:
        with FileLock(work_id):
            source = store.update_source(**kwargs)
            # here we temporarily get the resource to properly
            # log delete events. TODO: update this when accessing works by URL is implemented
            work = store.get_work(user=kwargs['user'], id=kwargs['work_id'])

            time = kwargs['timestamp']
            user = kwargs['user']
            resource = work['resource']
            payload = json.dumps(source.get_data())

            log_event.apply_async(args=('update_source', time, user, resource, payload))
            if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

            return source.get_data()
    else:
        source = store.update_source(**kwargs)

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = None
        payload = json.dumps(source.get_data())

        log_event.apply_async(args=('update_source', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return source.get_data()

    return store.update_source(**kwargs)

@app.task(base=StoreTask, bind=True)
def delete_source(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work_id = kwargs.get('work_id', None)

    if work_id:
        with FileLock(work_id):
            store.delete_source(**kwargs)

            # here we temporarily get the resource to properly
            # log delete events. TODO: update this when accessing works by URL is implemented
            work = store.get_work(user=kwargs['user'], id=kwargs['work_id'])

            time = kwargs['timestamp']
            user = kwargs['user']
            resource = work['resource']
            payload = json.dumps(kwargs)

            log_event.apply_async(args=('delete_source', time, user, resource, payload))
            if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

            return kwargs
    else:
        store.delete_source(**kwargs)

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = None
        payload = json.dumps(kwargs)

        log_event.apply_async(args=('delete_source', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return kwargs

# posted instances

@app.task(base=StoreTask, bind=True)
def add_post(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work_id = kwargs.get('work_id', None)

    with FileLock(work_id):
        post = store.store_post(**kwargs)

        # here we temporarily get the resource to properly
        # log events. TODO: update this when accessing works by URL is implemented
        work = store.get_work(user=kwargs['user'], id=work_id)

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = work['resource']
        payload = json.dumps(post.get_data())

        log_event.apply_async(args=('add_post', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        return post.get_data()

@app.task(base=StoreTask, bind=True)
def get_posts(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_posts(**kwargs)

@app.task(base=StoreTask, bind=True)
def get_post(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_post(**kwargs)

@app.task(base=StoreTask, bind=True)
def delete_post(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    work_id = kwargs.get('work_id', None)

    with FileLock(work_id):
        # here we temporarily get the resource to properly
        # log events. TODO: update this when accessing works by URL is implemented
        work = store.get_work(user=kwargs['user'], id=work_id)

        time = kwargs['timestamp']
        user = kwargs['user']
        resource = work['resource']
        payload = None

        log_event.apply_async(args=('delete_post', time, user, resource, payload))
        if store != self.public_store: on_work_updated.send(sender=self, task=self, update_subtask=self.subtask(kwargs=kwargs))

        store.delete_post(**kwargs)
        return kwargs

@app.task(base=StoreTask, bind=True)
def get_complete_metadata(self, store='main', **kwargs):
    store = self.main_store if store == 'main' else self.public_store
    return store.get_complete_metadata(**kwargs)

@app.task(base=StoreTask, bind=True)
def query_sparql(self, **kwargs):
    return self.public_store.query_sparql(**kwargs)

@app.task(base=StoreTask, bind=True)
def log_event(self, type, time, user, resource, data):
    self.log.log_event(type, time, user, resource, data)

@app.task(base=StoreTask, bind=True)
def query_events(self, type=None, user=None, time_min=None, time_max=None, resource=None, limit=100, offset=0):
    return self.log.query_events(type, user, time_min, time_max, resource, limit, offset)

@on_work_updated.connect
def work_updated_handler(sender=None, task=None, update_subtask=None, **kwargs):
    subtask_kwargs = update_subtask['kwargs']

    if sender == create_work:
        visibility = subtask_kwargs.get('visibility', None)
        if visibility != "public":
            return False
    elif sender == update_work:
        work_id = subtask_kwargs['id']
        work = task.main_store.get_work(user=subtask_kwargs['user'], id=work_id)
        visibility = subtask_kwargs.get('visibility', work['visibility'])
        if visibility != "public":
            return False
    elif sender == add_source or \
            sender == update_source or \
            sender == add_post:
        work_id = subtask_kwargs['work_id']
        work = task.main_store.get_work(user=subtask_kwargs['user'], id=work_id)
        if work['visibility'] != 'public':
            return False

    # work is public or deleted, ok to re-run the updater task for public store now
    sub = subtask(update_subtask)
    sub.apply_async(kwargs={"store": "public"})
