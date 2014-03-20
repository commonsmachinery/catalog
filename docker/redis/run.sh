#!/bin/sh

set -e
set -u

# Since the storage should come from an external data volume, make
# sure we have a database directory
mkdir -p /data/redis

exec redis-server /etc/redis/redis.conf $@


