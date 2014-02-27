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
import os, time
import errno

app = Celery('catalog_backend', broker='amqp://guest@localhost:5672//')

app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_ACCEPT_CONTENT = ['json'],
    CELERY_RESULT_SERIALIZER='json',
    CELERY_RESULT_BACKEND = 'amqp',
    CELERY_TASK_RESULT_EXPIRES = 30,
    CELERY_TASK_RESULT_DURABLE = False,
    CELERY_IMPORTS = ("catalog.store", "catalog_backend"),
)

class FileLock(object):
    def __init__(self, id, timeout=15, lockdir = '.'):
        self._filename = os.path.join(lockdir, 'lock-%s' % id)
        self._timeout = timeout
        self._locked = False

    def __enter__(self):
        assert not self._locked

        pid = str(os.getpid())
        timeout = self._timeout

        # Attempt locking by creating a symlink.  This is an atomic
        # operation that will succeed only if the link doesn't already
        # exist.  Use the PID as the "target file" to provide info
        # about who holds the link

        while True:
            try:
                os.symlink(pid, self._filename)
            except OSError, e:
                if e.errno == errno.EEXIST:
                    if timeout > 0:
                        time.sleep(1)
                        timeout -= 1
                    else:
                        raise RuntimeError("Timeout error while trying to lock access to work")
                else:
                    raise
            else:
                self._locked = True
                return


    def __exit__(self, *args):
        if self._locked:
            try:
                os.remove(self._filename)
            except OSError, e:
                if e.errno == errno.ENOENT:
                    print('warning: lock file unexpectedly removed')
                else:
                    raise
            self._locked = False


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
def create_work(**kwargs):
    work_id = create_work.main_store.store_work(**kwargs)
    return { 'id': work_id }

@app.task(base=StoreTask)
def update_work(**kwargs):
    id = kwargs['id']
    with FileLock(id):
        return update_work.main_store.update_work(**kwargs)

@app.task(base=StoreTask)
def delete_work(**kwargs):
    id = kwargs['id']
    with FileLock(id):
        return delete_work.main_store.delete_work(**kwargs)

@app.task(base=StoreTask)
def get_work(**kwargs):
    return get_work.main_store.get_work(**kwargs)

@app.task(base=StoreTask)
def get_works(**kwargs):
    return get_works.main_store.query_works_simple(**kwargs)

# sources of works

@app.task(base=StoreTask)
def add_source(**kwargs):
    # TODO: lock work here
    return add_source.main_store.store_source(**kwargs)

@app.task(base=StoreTask)
def get_sources(**kwargs):
    return get_sources.main_store.get_sources(**kwargs)

@app.task(base=StoreTask)
def delete_source(**kwargs):
    # TODO: lock work here
    return delete_source.main_store.delete_source(**kwargs)

# posted instances

@app.task(base=StoreTask)
def add_post(**kwargs):
    # TODO: lock work here
    return add_post.main_store.store_post(**kwargs)

@app.task(base=StoreTask)
def get_posts(**kwargs):
    return get_posts.main_store.get_posts(**kwargs)

@app.task(base=StoreTask)
def delete_post(**kwargs):
    # TODO: lock work here
    return delete_post.main_store.delete_post(**kwargs)

@app.task(base=StoreTask)
def get_metadata(**kwargs):
    return get_metadata.main_store.get_metadata(**kwargs)

@app.task(base=StoreTask)
def get_complete_metadata(**kwargs):
    return get_complete_metadata.main_store.get_complete_metadata(**kwargs)
