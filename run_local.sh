#! /bin/sh

BACKEND_DIR=$(pwd)/build/backend
FRONTEND_DIR=$(pwd)/build/frontend

if [ ! -f "run_local.py" ]; then
  echo "This script must be run from the catalog source dir!"
  exit 1
fi

if [ ! -d "data" ]; then
  mkdir data
fi

# if $VIRTUAL_ENV is unset, temporary enter virtualenv
if [ -n "$VIRTUAL_ENV" ];
then
    python run_local.py
else
    . $BACKEND_DIR/bin/activate
    python run_local.py
    deactivate
fi
