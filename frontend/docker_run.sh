#!/bin/sh

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"
export CATALOG_MONGODB_URL="mongodb://$MONGODB_PORT_27017_TCP_ADDR:$MONGODB_PORT_27017_TCP_PORT/"

cd /frontend
if [ $# -gt 0 ]
then
    node $@
else
    node server.js
fi
