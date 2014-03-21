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
    --rm -t \
    -u `id -u` \
    -v "$PWD:/frontend:rw" \
    -e HOME=/frontend \
    -w /frontend \
    dockerfile/nodejs \
    sh -c 'npm install; ./volo_add.sh'
