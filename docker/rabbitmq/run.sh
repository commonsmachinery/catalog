#!/bin/sh

set -e
set -u

. /etc/rabbitmq/rabbitmq-env.conf

# Since these may come from an external data volume, make sure they
# exist.
mkdir -p "$LOG_BASE" "$MNESIA_BASE"

# RabbitMQ doesn't say when it starts, so echo that.
echo
date

# We should really su rabbitmq here, but I can't get that to work for now.
exec /usr/lib/rabbitmq/bin/rabbitmq-server

