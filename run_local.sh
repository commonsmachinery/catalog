#! /bin/sh

BACKEND_DIR=$(pwd)/build/backend
FRONTEND_DIR=$(pwd)/build/frontend
DATA_DIR=$(pwd)/data

environment=${1:-development}

export NODE_ENV=$environment
export CATALOG_DATA_DIR="$DATA_DIR"

if [ ! -f "run_local.py" ]; then
  echo "This script must be run from the catalog source dir!"
  exit 1
fi

mkdir -p "$DATA_DIR/db"

# if $VIRTUAL_ENV is unset, temporary enter virtualenv
if [ -n "$VIRTUAL_ENV" ];
then
    python run_local.py
else
    . $BACKEND_DIR/bin/activate
    python run_local.py
    deactivate
fi
