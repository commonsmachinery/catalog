Catalog configuration
=====================

Frontend and backend have different syntax for configuration files,
but can both be configured using environment variables, which take
precedence over configuration files and defaults. 

Common configuration
--------------------

`CATALOG_BROKER_URL` - Celery broker URL.
    Default: `amqp://guest@localhost:5672//`

`CATALOG_MONGODB_URL` - MongoDB access URL.
    Default: `mongodb://localhost:27017/`

`CATALOG_REDIS_URL` - Redis URL.
    Default: `tcp://localhost:6379` (frontend)
             `localhost` (backend)

`CATALOG_DATA_DIR` - Database directory for SQLite databases (storage and log).
    Default: `./data`

`CATALOG_EVENT_LOG_TYPE` - Database for logging storage events: `mongodb` or `sqlite`.
    Default: `mongodb`

Backend configuration
---------------------

The storage type is selected with `CATALOG_BACKEND_STORE_TYPE`, which
is one of:

* `sqlite`: file-based store in `CATALOG_DATA_DIR`
* `postgresql` or `mysql`: database store (see further settings below)
* `memory`: memory-based store (only suitable for unit tests)

PostgreSQL storage additionally uses the following
environment variables (defaults 

* `CATALOG_BACKEND_STORE_DB_HOST` (default `localhost`)
* `CATALOG_BACKEND_STORE_DB_PORT` (default `5432`) 
* `CATALOG_BACKEND_STORE_DB_NAME`: Database prefix, full name of
   database is constructed by appending `_works` and `_public`.
   (default `catalog`) 
* `CATALOG_BACKEND_STORE_DB_USER` (default `docker`)
* `CATALOG_BACKEND_STORE_DB_PASSWORD` (default `docker`)


Frontend configuration
----------------------

`CATALOG_PORT` - Port which the frontend listens on.
    Default: `8004`

Celery
------

The only Celery option that can be currently set
via catalog configuration is `CELERY_DISABLE_RATE_LIMITS`
(Default: `True`).

Backend configuration file
--------------------------

Backend can be configured using a configuration file.  By default,
`catalog.conf` will be loaded as a Python file from current working
directory.  If `CATALOG_BACKEND_CONFIG_FILE` environment variable is
set, that file will be loaded instead.  All settings in this file uses
the full environment variable names listed above.


Frontend configuration file
---------------------------

Frontend configuration files can use parse-env syntax, described
in parse-env README: https://www.npmjs.org/package/parse-env

By default, configuration will be loaded from `frontend/config/development.js`
Alternatively, frontend config file can be specified with
`CATALOG_FRONTEND_CONFIG_FILE` environment variable.
