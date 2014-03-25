#!/bin/sh

set -u
set -e

if [ `id -u` = 0 ]
then
    echo "Do not run this script with sudo"
    exit 1
fi

cd `dirname "$0"`

# Run as the user launching the image
sudo docker run \
    --rm -t -i \
    -u `id -u` \
    -v "$PWD:/frontend:rw" \
    --link=cat-mongodb:mongodb \
    --link=cat-rabbitmq:rabbitmq \
    --link=cat-redis:redis \
    -p 127.0.0.1:8004:8004 \
    -e HOME=/frontend \
    -e DEBUG='frontend:*' \
    -w /frontend \
    dockerfile/nodejs \
    /frontend/docker_run.sh node_modules/nodemon/bin/nodemon.js server.js
