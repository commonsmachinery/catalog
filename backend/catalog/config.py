# -*- coding: utf-8 -*-
#
# catalog - backend for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

import os
import sys

DEFAULT_FILENAME = 'catalog.conf'
_config_filename = os.getenv('CATALOG_BACKEND_CONFIG_FILE', DEFAULT_FILENAME)


class Options:
    pass

config = Options()

class Defaults(object):
    CELERY = {
        'DISABLE_RATE_LIMITS':  True,
    }

    CATALOG = {
        # Infrastructure paths and URLS
        'BROKER_URL':   'amqp://guest@localhost:5672//',
        'MONGODB_URL':  'mongodb://localhost:27017/',
        'REDIS_URL':    'localhost',

        # Used for sqlite, typically only used in devevelopment
        'DATA_DIR': './data',

        # Event log type: sqlite or mongodb
        'EVENT_LOG_TYPE': 'sqlite',

        # Name of event log DB (when using MongoDB)
        'EVENT_LOG_DB': 'events',

        # backend store type: postgresql, memory or sqlite
        'BACKEND_STORE_TYPE': 'sqlite',

        # postgres store options
        'BACKEND_STORE_DB_HOST': 'localhost',
        'BACKEND_STORE_DB_PORT': '5432',
        'BACKEND_STORE_DB_NAME': 'catalog',
        'BACKEND_STORE_DB_USER': 'docker',
        'BACKEND_STORE_DB_PASSWORD': 'docker',
    }


def _load_config():
    file_config = {}
    try:
        # Loading config as a python file is convenient, but possibly
        # unsafe.  However, the user running this is also likely to
        # have control of the config file contents, or be fine with
        # whatever the root has provided for them.

        execfile(_config_filename, file_config)
        sys.stderr.write('using configuration from {0}\n'.format(_config_filename))

    except SyntaxError, e:
        sys.exit('error reading config file {0}: {1}'
                 .format(_config_filename, e))
    except IOError:
        if _config_filename == DEFAULT_FILENAME:
            sys.stderr.write('no configuration file, using env and defaults\n')
        else:
            # if the user points out a file and we can't read it,
            # that's very bad and we can't progess safely.
            sys.exit('config file {0} (indicated by $CATALOG_BACKEND_CONFIG_FILE) cannot be read: {1}'.format(_config_filename, error))

    for section in [s for s in Defaults.__dict__.keys() if not s.startswith('__')]:
        for name, default_value in getattr(Defaults, section).items():
            name = section + "_" + name

            value = os.getenv(name, file_config.get(name, default_value))

            setattr(config, name, value)

_load_config()
