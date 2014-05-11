#!/bin/bash

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"
export CATALOG_MONGODB_URL="mongodb://$MONGODB_PORT_27017_TCP_ADDR:$MONGODB_PORT_27017_TCP_PORT/"
export CATALOG_REDIS_URL="$REDIS_PORT_6379_TCP_ADDR"
export CATALOG_DATA_DIR=/data/backend/data
export CATALOG_EVENT_LOG_TYPE=mongodb

# postgres store options
export CATALOG_BACKEND_STORE_TYPE="postgresql"
export CATALOG_BACKEND_STORE_DB_HOST="$POSTGRES_PORT_5432_TCP_ADDR"
export CATALOG_BACKEND_STORE_DB_PORT="$POSTGRES_PORT_5432_TCP_PORT"
export CATALOG_BACKEND_STORE_DB_NAME="catalog"
export CATALOG_BACKEND_STORE_DB_USER="docker"
export CATALOG_BACKEND_STORE_DB_PASSWORD="docker"

# This should come from a data volume, so make sure it exists and has the right params
mkdir -p /data/backend/data
chown 755 /data
chown -R daemon.daemon /data/backend

cd /backend
exec /usr/local/bin/celery worker \
    --app=catalog \
    --uid=daemon \
    --gid=daemon \
    --loglevel=info \
    --workdir="/backend"
