#! /bin/bash

BASE_DIR="$( pwd )"
BACKEND_DIR=$BASE_DIR/build/backend
DATA_DIR=$BASE_DIR/data
export CATALOG_DATA_DIR="$DATA_DIR"

mkdir -p "$DATA_DIR"

function init_stores() {
python <<END
import RDF, os
from catalog.config import config

works_name = os.path.join(config.CATALOG_DATA_DIR, "works")
public_name = os.path.join(config.CATALOG_DATA_DIR, "public")

store = RDF.Storage(name=works_name, storage_name="sqlite", options_string="new='true'")
model = RDF.Model(store)
model.sync()

store = RDF.Storage(name=public_name, storage_name="sqlite", options_string="new='true'")
model = RDF.Model(store)
model.sync()
END
}

# if $VIRTUAL_ENV is unset, temporary enter virtualenv
if [ -n "$VIRTUAL_ENV" ];
then
    cd $DATA_DIR
    init_stores
    cd $BASE_DIR
else
    . $BACKEND_DIR/bin/activate
    cd $DATA_DIR
    init_stores
    cd $BASE_DIR
    deactivate
fi
