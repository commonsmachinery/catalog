#! /bin/bash

if [ "$init_db_mode" != "docker" ]
then
    # running locally, init some variables
    BACKEND_BASE_DIR="$(dirname "$(dirname "$0")")"
    BACKEND_BUILD_DIR=$BACKEND_BASE_DIR/build/backend
    CATALOG_DATA_DIR=$BACKEND_BASE_DIR/data

    mkdir -p "$CATALOG_DATA_DIR"

    $BACKEND_BUILD_DIR/bin/python "$(dirname "$0")/init_db.py"
else
    # running in docker, need different variables
    export CATALOG_BACKEND_STORE_TYPE="postgresql"
    export CATALOG_BACKEND_STORE_DB_HOST="$POSTGRES_PORT_5432_TCP_ADDR"
    export CATALOG_BACKEND_STORE_DB_PORT="$POSTGRES_PORT_5432_TCP_PORT"
    export CATALOG_BACKEND_STORE_DB_NAME="catalog"
    export CATALOG_BACKEND_STORE_DB_USER="docker"
    export CATALOG_BACKEND_STORE_DB_PASSWORD="docker"

    "$(dirname "$0")/init_db.py"
fi
