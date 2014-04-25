#! /bin/bash

function init_stores() {
python <<END
import RDF, os

from catalog.config import config
from catalog.store import MainStore

for name in ['public', 'works']:
    storage_type, options = MainStore.get_store_options(name)

    # workaround: sqlite doesn't support 'dir' so prepend directory to the name
    if storage_type == 'sqlite':
        name = os.path.abspath(os.path.join(config.CATALOG_DATA_DIR, name))

    options = options + "new='true'"

    store = RDF.Storage(storage_name=storage_type, name=name, options_string=options)
    model = RDF.Model(store)
    model.sync()
END
}

if [ "$init_db_mode" != "docker" ]
then
    # running locally, init some variables
    BACKEND_BASE_DIR="$(dirname "$(dirname "$0")")"
    BACKEND_BUILD_DIR=$BACKEND_BASE_DIR/build/backend
    CATALOG_DATA_DIR=$BACKEND_BASE_DIR/data

    mkdir -p "$CATALOG_DATA_DIR"

    if [ -n "$VIRTUAL_ENV" ]
    then
        init_stores
        cd $BACKEND_BASE_DIR
    else
        . $BACKEND_BUILD_DIR/bin/activate
        init_stores
        cd $BACKEND_BASE_DIR
        deactivate
    fi
else
    # running in docker, need different variables
    export CATALOG_BACKEND_STORE_TYPE="postgresql"
    export CATALOG_BACKEND_STORE_DB_HOST="$POSTGRES_PORT_5432_TCP_ADDR"
    export CATALOG_BACKEND_STORE_DB_PORT="$POSTGRES_PORT_5432_TCP_PORT"
    export CATALOG_BACKEND_STORE_DB_NAME="catalog"
    export CATALOG_BACKEND_STORE_DB_USER="docker"
    export CATALOG_BACKEND_STORE_DB_PASSWORD="docker"

    init_stores
fi
