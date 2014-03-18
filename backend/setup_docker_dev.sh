#!/bin/sh

set -e

cd `dirname "$0"`

# Create temporary container with all dependencies installed

sudo docker run \
    --name=backend-dev-tmp \
    -v "$PWD:/backend:rw" -v /data \
    -w /backend \
    commonsmachinery/backend-base \
    python setup.py develop

# Commit that to an image and set the run command
sudo docker commit \
    --run='{"Entrypoint": ["/backend/docker_run.sh"]}' \
    backend-dev-tmp local/backend-dev

# Drop the old container now
sudo docker rm backend-dev-tmp

# Set up a permanent container with all correct links and start it.

set +x

echo
echo "Starting the backend container.  Restart it later with:"
echo "sudo docker start backend-dev"
echo
echo "Read the output with:"
echo "sudo docker logs -f backend-dev"
echo

sudo docker run -d \
    --name=backend-dev \
    -v "$PWD:/backend:rw" -v /data \
    --link=cat-rabbitmq:rabbitmq \
    --link=cat-mongodb:mongodb \
    local/backend-dev

