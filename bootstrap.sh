#! /bin/bash

BASE_DIR="$( pwd )"
DOWNLOAD_DIR=$BASE_DIR/build/tmp
BACKEND_DIR=$BASE_DIR/build/backend
FRONTEND_DIR=$BASE_DIR/build/frontend

./setup_devenv.sh

#if [ -f $FRONTEND_DIR/bin/npm ];
#then
#    echo "Node.js already installed, skipping installation."
#else
#    cd "$DOWNLOAD_DIR"
#    echo "Node.js not installed in the frontend directory, downloading..."
#    curl http://nodejs.org/dist/node-latest.tar.gz | tar -xzv
#    cd node-v*
#    python ./configure --prefix=$FRONTEND_DIR
#    make install
#    cd "$BASE_DIR"
#fi

if [ -f $BACKEND_DIR/bin/redis-server ];
then
   echo "Redis already installed, skipping installation."
else
   cd "$DOWNLOAD_DIR"
   echo "Redis not installed, downloading..."
   curl http://download.redis.io/releases/redis-stable.tar.gz | tar -xzv
   cd redis-stable
   make install PREFIX=$BACKEND_DIR
   cd $BASE_DIR""
fi

if [ -f $BACKEND_DIR/bin/mongod ];
then
    echo "MongoDB already installed, skipping installation."
else
    echo "MongoDB not installed, downloading..."
    cd "$DOWNLOAD_DIR"
    MONGODB_BDIST_DIR=mongodb-linux-`uname -m`-2.4.9
    MONGODB_BDIST_TGZ=$MONGODB_BDIST_DIR.tgz
    wget -c http://fastdl.mongodb.org/linux/$MONGODB_BDIST_TGZ
    tar --strip-components=2 --directory=$BACKEND_DIR/bin -xzvf $MONGODB_BDIST_TGZ $MONGODB_BDIST_DIR/bin/mongod
    cd "$BASE_DIR"
fi

echo "Initializing local database..."
./init_sqlite.sh

