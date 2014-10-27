#!/bin/sh

set -e

env

export NODE_ENV="${NODE_ENV:-production}"

# Setup links to infrastructure, basing it on what's provided by the
# container runner

tmpurl=$(node /catalog/docker/get_mongodb_url.js)
if [ -z "$tmpurl" ]
then
    echo "No MongoDB link"
    exit 1
fi

export CATALOG_MONGODB_URL="$tmpurl"
export CATALOG_SEARCH_HASH_DB="${CATALOG_SEARCH_HASH_DB:-/hashdb/hashes.kch}"


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
