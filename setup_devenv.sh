#!/bin/bash

set -u
set -e

BASE_DIR="$( pwd )"
DOWNLOAD_DIR="$BASE_DIR/build/tmp"
BACKEND_DIR="$BASE_DIR/build/backend"

mkdir -p "$DOWNLOAD_DIR"

if [ -x "$BACKEND_DIR/bin/python" ]
then
    echo "*** Python already installed, skipping installation."
else
    echo "*** Python not installed in the backend directory, setting up virtualenv..."
    echo
    virtualenv "$BACKEND_DIR"
fi

echo
echo "*** Installing/updating Python dependencies"
echo

(
    cd backend;
    "$BACKEND_DIR/bin/python" setup.py develop
)


if [ -f $BACKEND_DIR/lib/python2.7/site-packages/RDF.py ];
then
    echo
    echo "*** Redland already installed, skipping installation."
else
    echo
    echo "*** Redland not installed, downloading..."
    echo

    (
        cd "$DOWNLOAD_DIR"
        git clone --depth 1 https://github.com/commonsmachinery/redland-bindings.git
        cd redland-bindings
        ./autogen.sh --prefix="$BACKEND_DIR" --with-python="$BACKEND_DIR/bin/python"
        cd python
        make install
    )
fi


echo
echo "*** Installing/updating frontend Node dependencies"
echo

(
    cd frontend
    npm install
    ./volo_add.sh
)

echo
echo "*** Installing/updating apitest Node dependencies"
echo

(
    cd apitest
    npm install
)

