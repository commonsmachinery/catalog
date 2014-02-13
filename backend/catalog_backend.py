# -*- coding: utf-8 -*-
#
# backend - query/update graphs for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

from celery import Celery
from celery import Task
from celery.signals import worker_shutdown
from catalog.store import RedlandStore

app = Celery('catalog_backend', broker='amqp://guest@localhost//')

app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_RESULT_SERIALIZER='json',
    CELERY_RESULT_BACKEND = 'amqp'
)

class StoreTask(app.Task):
    abstract = True
    _main_store = None
    _public_store = None

    @property
    def main_store(self):
        if self._main_store is None:
            self._main_store = RedlandStore("works")
        return self._main_store

    @property
    def public_store(self):
        if self._public_store is None:
            self._public_store = RedlandStore("public")
        return self._public_store

@app.task(base=StoreTask)
def event(**kwargs):
    main_store = event.main_store
    ev = kwargs['event']
    print ev

    if ev["type"] == "catalog.work.created":
        main_store.store_work(ev["data"])
    elif ev["type"] == "catalog.work.updated":
        # TODO: currently raises TypeError, because id is None
        main_store.update_work(ev["data"])
    elif ev["type"] == "catalog.work.deleted":
        # TODO: currently raises TypeError, because id is None
        main_store.delete_work(ev["data"]["id"])
    else:
        raise RuntimeError("Unknown event type")
    return True
