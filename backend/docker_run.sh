#!/bin/bash

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"

# This should come from a data volume, so make sure it exists and has the right params
mkdir -p /data/celery /data/backend/data
chown 755 /data
chown -R daemon.daemon /data/celery /data/backend

cd /data/backend

exec /usr/local/bin/celery worker \
    --app=catalog \
    --uid=daemon \
    --gid=daemon \
    --loglevel=info \
    --workdir="/data/celery" \
    --autoreload 
