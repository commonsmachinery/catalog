#!/bin/sh

set -e
set -u

# Since the storage should come from an external data volume, make
# sure we have a database directory
mkdir -p /data/mongodb

exec mongod --config /etc/mongodb.conf $@


