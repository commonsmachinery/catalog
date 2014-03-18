Deploying the catalog with Docker
=================================

Get started with Docker here:
http://docs.docker.io/en/latest/use/basics/

Getting third-party images
--------------------------

These seem to be good base images for the services:

    sudo docker pull dockerfile/mongodb
    sudo docker pull dockerfile/redis
    sudo docker pull networld/rabbitmq


Building catalog images
-----------------------

The backend dependencies are built into a base image, which can then
either be used as-is to run the backend manually, or used to build a
proper backend image.

We'll might upload this to a registry later, but for now you have to
build it yourself:

    sudo docker build -t commonsmachinery/backend-base docker/backend-base


Development usage
-----------------

Start the infrastructure containers:

    sudo docker run --name=cat-mongodb -d -p 27017:27017 dockerfile/mongodb
    sudo docker run --name=cat-redis -d -p 6379:6379 dockerfile/redis
    sudo docker run --name=cat-rabbitmq -d -p 5672:5672 networld/rabbitmq

In development you might want to run the frontend and backend in the
host environment, so `-p` here forwards the container ports.  The
frontend and backend can then be run directly.


### Creating a backend development image

Instead of building a full backend container or running in the host,
you can set up a development container that directly uses the source
code and properly links into the infrastructure containers.

The script `backend/setup_docker_dev.sh` creates an image for this and
starts a container running celery.  It will auto-reload any changed
files in the source directory.

Useful commands:

    sudo docker start backend-dev
    sudo docker logs -f backend-dev
    sudo docker stop backend-dev


Production usage
----------------



Useful commands
---------------

List available images:

    sudo docker images

List running containers (add `-a` to see inactive too):

    sudo docker ps
    

