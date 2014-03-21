#! /bin/bash

BASE_DIR="$( pwd )"
DOWNLOAD_DIR=$BASE_DIR/build/tmp
BACKEND_DIR=$BASE_DIR/build/backend
FRONTEND_DIR=$BASE_DIR/build/frontend

if [ ! -d "$DOWNLOAD_DIR" ]; then
  mkdir -p "$DOWNLOAD_DIR"
fi

if [ -f $BACKEND_DIR/bin/celery ];
then
    echo "Python already installed, skipping installation."
else
    echo "Python not installed in the backend directory, setting up virtualenv..."
    virtualenv $BACKEND_DIR
    #$BACKEND_DIR/bin/pip install -r requirements_backend.txt
fi

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

if [ -f $BACKEND_DIR/lib/python2.7/site-packages/RDF.py ];
then
    echo "Redland already installed, skipping installation."
else
    echo "Redland not installed, downloading..."
    cd "$DOWNLOAD_DIR"
    git clone https://github.com/dajobe/redland-bindings.git
    cd redland-bindings
    ./autogen.sh --prefix=$BACKEND_DIR --with-python=$BACKEND_DIR/bin/python
    cd python
    make install
    cd "$BASE_DIR"
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



#
# Frontend
#

VOLO=node_modules/volo/bin/volo

echo "Getting frontend dependencies..."
cd frontend
    npm install
    node $VOLO add
    # Hard dependencies can't be set in package.json
    node $VOLO add -amd github:amdjs/underscore/1.5.2 exports=_
    node $VOLO add -amd github:jashkenas/backbone/1.1.2 depends=jquery,underscore exports=Backbone
    node $VOLO add -amd https://raw.github.com/theironcook/Backbone.ModelBinder/master/Backbone.ModelBinder.js depends=backbone
cd ..