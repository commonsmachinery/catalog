#! /bin/bash

BACKEND_DIR=$(pwd)/build/backend
FRONTEND_DIR=$(pwd)/build/frontend

if [ -f $BACKEND_DIR/bin/celery ];
then
    echo "Python already installed, skipping installation."
else
    echo "Python not installed in the backend directory, setting up virtualenv..."
    virtualenv $BACKEND_DIR
    $BACKEND_DIR/bin/pip install -r requirements_backend.txt
fi

#if [ -f $FRONTEND_DIR/bin/npm ];
#then
#    echo "Node.js already installed, skipping installation."
#else
#    echo "Node.js not installed in the frontend directory, downloading..."
#    curl http://nodejs.org/dist/node-latest.tar.gz | tar -xzv
#    cd node-v*
#    python ./configure --prefix=$FRONTEND_DIR
#    make install
#    cd ..
#fi

if [ -f $BACKEND_DIR/bin/redis-server ];
then
    echo "Redis already installed, skipping installation."
else
    echo "Redis not installed, downloading..."
    curl http://download.redis.io/releases/redis-stable.tar.gz | tar -xzv
    cd redis-stable
    make install PREFIX=$BACKEND_DIR
    cd ..
fi

if [ -f $BACKEND_DIR/lib/python2.7/site-packages/RDF.py ];
then
    echo "Redland already installed, skipping installation."
else
    echo "Redland not installed, downloading..."
    curl http://download.librdf.org/source/redland-bindings-1.0.16.1.tar.gz | tar -xzv
    cd redland-bindings-1.0.16.1
    ./configure --prefix=$BACKEND_DIR --with-python=$BACKEND_DIR/bin/python
    cd python
    make install
    cd ..
    cd ..
fi
