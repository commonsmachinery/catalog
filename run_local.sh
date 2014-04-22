#! /bin/bash

BASE_DIR="$( pwd )"
BACKEND_BUILD_DIR=$BASE_DIR/build/backend
FRONTEND_DIR=$BASE_DIR/frontend
DATA_DIR=$BASE_DIR/data

environment=${1:-development}

export NODE_ENV=$environment
export CATALOG_DATA_DIR="$DATA_DIR"

function stop_components()
{
    kill $CHILD_PIDS
}

function start_components()
{
    celery -A catalog.tasks worker --loglevel=info --autoreload &
    PID_CELERY="$!"

    redis-server redis_local.conf &
    PID_REDIS="$!"

    cd "$FRONTEND_DIR"
    node node_modules/nodemon/bin/nodemon.js server.js &
    PID_FRONTEND="$!"
    cd "$BASE_DIR"

    mongod --smallfiles --dbpath "$CATALOG_DATA_DIR/db" &
    PID_MONGODB="$!"

    CHILD_PIDS="$PID_CELERY $PID_REDIS $PID_FRONTEND $PID_MONGODB"
}

function run_catalog()
{
    start_components
    trap "stop_components; exit" SIGINT SIGQUIT SIGTERM SIGCHLD
    wait
}

if [ ! -f "run_local.sh" ]; then
    echo "This script must be run from the catalog source dir!"
    exit 1
fi

mkdir -p "$DATA_DIR/db"

if [ -n "$VIRTUAL_ENV" ];
then
    run_catalog
else
    . $BACKEND_BUILD_DIR/bin/activate
    run_catalog
    deactivate
fi
