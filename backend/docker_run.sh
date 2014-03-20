#!/bin/bash

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"
export CATALOG_MONGODB_URL="mongodb://$MONGODB_PORT_27017_TCP_ADDR:$MONGODB_PORT_27017_TCP_PORT/"
export CATALOG_DATA_DIR=/data/backend/data
export CATALOG_EVENT_LOG_TYPE=mongodb

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
    --workdir="/backend" \
    --autoreload 
