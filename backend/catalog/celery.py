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
from catalog.log import SqliteLog, MongoDBLog
from catalog.store import MainStore, PublicStore

import redis
import os, time
import errno

import logging.config
import importlib

import logging
_log = logging.getLogger("catalog")


APP_SETTINGS_FILENAME = "settings"
LOG_SETTINGS_FILENAME = "logging.ini"

if os.path.exists(LOG_SETTINGS_FILENAME):
    logging.config.fileConfig(LOG_SETTINGS_FILENAME)
else:
    _log.setLevel(logging.DEBUG)
    _log.addHandler(logging.StreamHandler())
    _log.warning('no %s, using default logging configuration', LOG_SETTINGS_FILENAME)


# Default configuration if there is no settings.py
class DefaultConfig:
    # Infrastructure paths and URLS
    BROKER_URL = os.getenv('CATALOG_BROKER_URL', 'amqp://guest@localhost:5672//')
    MONGODB_URL = os.getenv('CATALOG_MONGODB_URL', 'mongodb://localhost:27017/')

    # Used for sqlite and Redland local storage, typically only used in devevelopment
    DATA_DIR = os.getenv('CATALOG_DATA_DIR', './data')

    # Event log type: sqlite or mongodb
    EVENT_LOG_TYPE = os.getenv('CATALOG_EVENT_LOG_TYPE', 'sqlite')

    # Name of event log DB (when using MongoDB)
    EVENT_LOG_DB = 'events'


app = Celery('catalog', include=['catalog.tasks'])

# Attempt to read configuration from settings module
try:
    config = importlib.import_module(APP_SETTINGS_FILENAME)
except ImportError as e:
    _log.warning('no %s.py module, using default configuration', APP_SETTINGS_FILENAME)
    config = DefaultConfig

for _key, _value in config.__dict__.items():
    if not _key.startswith('_') and _key != 'os':
        _log.debug('Setting %s = %s', _key, _value)

# Use configuration provided by user
app.config_from_object(config)

# And set some technical stuff that the user shouldn't be allowed to touch
app.conf.update(
    CELERY_TASK_SERIALIZER='json',
    CELERY_ACCEPT_CONTENT = ['json'],
    CELERY_RESULT_SERIALIZER='json',
    CELERY_RESULT_BACKEND = 'amqp',
    CELERY_TASK_RESULT_EXPIRES = 30,
    CELERY_TASK_RESULT_DURABLE = False,
    CELERY_DISABLE_RATE_LIMITS = True,
)

on_create_work          = Signal(providing_args=('user', 'work_uri', 'work_data'))
on_update_work          = Signal(providing_args=('user', 'work_uri', 'work_data'))
on_delete_work          = Signal(providing_args=('user', 'work_uri'))
on_create_work_source   = Signal(providing_args=('user', 'work_uri', 'source_uri', 'source_data'))
on_create_stock_source  = Signal(providing_args=('user', 'source_uri', 'source_data'))
on_update_source        = Signal(providing_args=('user', 'source_uri', 'source_data'))
on_delete_source        = Signal(providing_args=('user', 'source_uri'))
on_create_post          = Signal(providing_args=('user', 'work_uri', 'post_uri', 'post_data'))
on_delete_post          = Signal(providing_args=('user', 'post_uri'))


class LockTimeoutError(Exception):
    pass


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
                        raise LockTimeoutError("Timeout error while trying to lock access to work")
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
                    _log.warning('warning: lock file unexpectedly removed')
                else:
                    raise
            self._locked = False


class RedisLock(object):
    def __init__(self, id, timeout=15):
        self._key = "lock." + id
        self._conn = redis.Redis()
        self._timeout = timeout
        self._locked = False

    def __enter__(self):
        assert not self._locked

        pid = str(os.getpid())
        timeout = self._timeout

        while True:
            if self._conn.setnx(self._key, pid):
                self._locked = True
                return
            else:
                if timeout > 0:
                    time.sleep(1)
                    timeout -= 1
                else:
                    raise LockTimeoutError("Timeout error while trying to lock access to work")

    def __exit__(self, *args):
        if self._locked:
            result = self._conn.delete(self._key)
            if not result:
                _log.warning('warning: lock file unexpectedly removed')
            self._locked = False


class StoreTask(app.Task):
    abstract = True
    _main_store = None
    _public_store = None
    _log = None

    @property
    def main_store(self):
        if self._main_store is None:
            self._main_store = MainStore("works")
        return self._main_store

    @property
    def public_store(self):
        if self._public_store is None:
            self._public_store = PublicStore("public")
        return self._public_store

    @property
    def log(self):
        if self._log is None:
            if config.EVENT_LOG_TYPE == 'sqlite':
                self._log = SqliteLog(config.DATA_DIR)
            elif config.EVENT_LOG_TYPE == 'mongodb':
                self._log = MongoDBLog(config.MONGODB_URL, config.EVENT_LOG_DB)
            else:
                raise RuntimeError('invalid event log configuration: %s' % config.EVENT_LOG_TYPE)

        return self._log


if __name__ == '__main__':
    app.start()
