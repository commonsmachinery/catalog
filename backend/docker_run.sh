#!/bin/bash

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"

chown daemon.daemon /data

exec /usr/local/bin/celery worker \
    --app=catalog \
    --uid=daemon \
    --gid=daemon \
    --loglevel=info \
    --workdir="/data" \
    --autoreload 

