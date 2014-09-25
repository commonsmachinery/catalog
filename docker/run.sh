#!/bin/sh

set -e

env

export NODE_ENV="${NODE_ENV:-production}"

# Link to infrastructure.
# Fail on missing env vars to ensure we have the necessary infrastructure
set -u
export CATALOG_MONGODB_URL="mongodb://$MONGODB_PORT_27017_TCP_ADDR:$MONGODB_PORT_27017_TCP_PORT/"
set +u

case "$1" in
    # Subcomponent main.js
    frontend/catalog | frontend/index | modules/core | modules/event )
        cd "/catalog/$1"
        ;;

    # All-in-one catalog process
    all )
        cd /catalog
        ;;

    *)
        echo "invalid component: $1" >&2
        exit 1
        ;;
esac

exec node main.js
