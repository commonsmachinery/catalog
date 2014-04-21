# -*- coding: utf-8 -*-
#
# catalog - backend for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

import os, ast

DEFAULT_FILENAME = 'catalog.conf'
_config_filename = os.getenv('CATALOG_BACKEND_CONFIG_FILE', DEFAULT_FILENAME)

def parse_option_value(value):
    try:
        return ast.literal_eval(value)
    except (SyntaxError, ValueError) as e:
        return str(value)

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

        # backend store type: postgres, memory or sqlite
        'BACKEND_STORE_TYPE': 'sqlite',

        # postgres store options
        'BACKEND_STORE_DB_HOST': 'localhost',
        'BACKEND_STORE_DB_PORT': '5432',
        'BACKEND_STORE_DB_NAME': 'catalog',
        'BACKEND_STORE_DB_USER': 'postgres',
        'BACKEND_STORE_DB_PASSWORD': '',
    }

def _load_config():
    file_config = {}
    try:
        config_file = open(_config_filename)
        for s in config_file.readlines():
            s = s.strip()
            if s == '' or s.startswith("#"):
                continue

            if s.find("=") < 1 or s.find("=") == len(s) - 1:
                raise RuntimeError("Invalid name string: {0}".format(s))

            name, value = map(lambda w: w.strip(), s.split("=", 1))
            file_config[name] = parse_option_value(value)
    except IOError:
        pass

    for section in [s for s in Defaults.__dict__.keys() if not s.startswith('__')]:
        #setattr(config, section.lower(), Config())
        for name, default_value in getattr(Defaults, section).items():
            name = section + "_" + name

            value = os.getenv(name, file_config.get(name, default_value))

            setattr(config, name, value)

_load_config()