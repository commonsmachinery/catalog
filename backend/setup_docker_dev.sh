#!/bin/sh

set -e

cd `dirname "$0"`

docker stop backend-dev || true
docker rm backend-dev || true

# Create temporary container with all dependencies installed

docker run \
    --name=backend-dev-tmp \
    -v "$PWD:/backend:rw" \
    -w /backend \
    commonsmachinery/backend-base \
    python setup.py develop

# Commit that to an image and set the run command
docker rmi local/backend-dev || true
docker commit \
    --run='{"Entrypoint": ["/backend/docker_run.sh"]}' \
    backend-dev-tmp local/backend-dev

# Drop the temporary container now
docker rm backend-dev-tmp

# Set up a permanent container with all correct links and start it.

echo
echo "Starting the backend container.  Restart it later with:"
echo "sudo docker start backend-dev"
echo
echo "Read the output with:"
echo "sudo docker logs -f backend-dev"
echo

docker run -d \
    --name=backend-dev \
    -v "$PWD:/backend:rw" \
    --volumes-from=DATA \
    --link=cat-mongodb:mongodb \
    --link=cat-rabbitmq:rabbitmq \
    --link=cat-redis:redis \
    --link=cat-postgres:postgres \
    local/backend-dev

