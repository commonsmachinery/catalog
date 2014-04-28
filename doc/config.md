Catalog configuration
=====================

Frontend and backend have different syntax for configuration files,
but can both be configured using environment variables, which take
precedence over configuration files and defaults. The variables are:

CATALOG_BROKER_URL - Celery broker URL.
    Default: amqp://guest@localhost:5672//

CATALOG_MONGODB_URL - MongoDB access URL.
    Default: mongodb://localhost:27017/

CATALOG_REDIS_URL - Redis URL.
    Default: tcp://localhost:6379 (frontend)
             localhost (backend)

CATALOG_DATA_DIR - Database directory for SQLite databases (storage and log).
    Default: ./data

CATALOG_EVENT_LOG_TYPE - Database for logging storage events: 'mongodb' or 'sqlite'.
    Default: mongodb

Database backend options
------------------------

PostgreSQL storage additionally uses the following self-explanatory
environment variables:

CATALOG_BACKEND_STORE_DB_HOST
CATALOG_BACKEND_STORE_DB_PORT
CATALOG_BACKEND_STORE_DB_NAME
CATALOG_BACKEND_STORE_DB_USER
CATALOG_BACKEND_STORE_DB_PASSWORD

Frontend variables
------------------

CATALOG_PORT - Port which the frontend listens on.
    Default: 8004

Celery
------

The only Celery option that can be currently set
via catalog configuration is CELERY_DISABLE_RATE_LIMITS
(Default: True).

Backend configuration file
--------------------------

Backend can be configured using a configuration file.
By default, catalog.conf will be loaded from current working directory.
If CATALOG_BACKEND_CONFIG_FILE environment variable is set, that file will
be loaded instead.

The file should consists of lines in the form OPTION=VALUE. Options
are the same as environment variables above. Values using Python
syntax are allowed (e.g. CELERY_DISABLE_RATE_LIMITS=True).
Lines starting with # will be ignored.

Frontend configuration file
---------------------------

Frontend configuration files can use parse-env syntax, described
in parse-env README: https://www.npmjs.org/package/parse-env

By default, configuration will be loaded from frontend/config/development.js
Alternatively, frontend config file can be specified with
CATALOG_FRONTEND_CONFIG_FILE environment variable.
