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

from celery import Celery
from celery import Task
from celery.utils.dispatch import Signal
from catalog.store import RedlandStore
from catalog.log import MongoDBLog
import os, time
import errno

import logging.config
import importlib

import logging
_log = logging.getLogger("catalog")


APP_SETTINGS_FILENAME = "settings.py"
LOG_SETTINGS_FILENAME = "logging.ini"

app = Celery('catalog',
    broker='amqp://guest@localhost:5672//',
    include=['catalog.tasks'])

app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_ACCEPT_CONTENT = ['json'],
    CELERY_RESULT_SERIALIZER='json',
    CELERY_RESULT_BACKEND = 'amqp',
    CELERY_TASK_RESULT_EXPIRES = 30,
    CELERY_TASK_RESULT_DURABLE = False,
    #CELERY_IMPORTS = ("catalog.store", "catalog.log", "catalog.tasks"),
)

try:
    confmodule = importlib.import_module(APP_SETTINGS_FILENAME)
    app.config_from_object(confmodule.CeleryOptions)
except ImportError as e:
    pass

if os.path.exists(LOG_SETTINGS_FILENAME):
    logging.config.fileConfig(LOG_SETTINGS_FILENAME)


on_work_updated = Signal(providing_args=('task', 'update_subtask'))


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
    _log = None

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

    @property
    def log(self):
        if self._log is None:
            self._log = MongoDBLog()
        return self._log


if __name__ == '__main__':
    app.start()
