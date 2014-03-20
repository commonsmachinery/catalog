Deploying the catalog with Docker
=================================

Get started with Docker here:
http://docs.docker.io/en/latest/use/basics/

Getting third-party images
--------------------------

These seem to be good base images for the services:

    sudo docker pull dockerfile/mongodb
    sudo docker pull dockerfile/redis


Building catalog images
-----------------------

We'll might upload our own images to a registry later, but for now you
have to build them yourself:

The backend dependencies are built into a base image, which can then
either be used as-is to run the backend manually, or used to build a
proper backend image.

    sudo docker build -t commonsmachinery/backend-base docker/backend-base

We also have some infrastructure images:

    sudo docker build -t commonsmachinery/rabbitmq docker/rabbitmq
    sudo docker build -t commonsmachinery/mongodb docker/mongodb
    sudo docker build -t commonsmachinery/redis docker/redis


Data image and container
------------------------

It is a good practice to store all data in dedicated volumes
associated with a data container, that the other containers can then
easily refer to.

Build the data image:

    sudo docker build -t data docker/data

Then create a container for it:

    sudo docker run -d --name=DATA data

The container is set up to run forever, so it is a bit harder to
remove it accidentially.  (It must be stopped first.)

The data volume can be inspected by running a temporary container that
uses it:

    sudo docker run -t -i --rm --volumes-from=DATA ubuntu bash

It can be backed up like this:

    sudo docker run --rm --volumes-from=DATA -v $(pwd):/backup busybox tar cvf /backup/backup.tar /data


Development usage
-----------------

Start the infrastructure containers:

    sudo docker run --name=cat-mongodb -d -p 127.0.0.1:27017:27017 -p 127.0.0.1:28017:28017 --volumes-from=DATA commonsmachinery/mongodb
    sudo docker run --name=cat-redis -d -p 127.0.0.1:6379:6379 --volumes-from=DATA commonsmachinery/redis
    sudo docker run --name=cat-rabbitmq -d -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672 --volumes-from=DATA commonsmachinery/rabbitmq

In development you might want to run the frontend and backend in the
host environment, so `-p` here forwards the container ports.  The
frontend and backend can then be run directly.

Some REST/web interfaces can be accessed on these URLS:

* MongoDB: http://127.0.0.1:28017/
* RabbitMQ: http://127.0.0.1:15672/ (guest/guest)


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

For some reason celery lists the loaded tasks in a way that they only
appear when the image is shut down, but "celery@xyz ready" should
indicate that it is running ok.


Production usage
----------------



Useful commands
---------------

List available images:

    sudo docker images

List running containers (add `-a` to see inactive too):

    sudo docker ps
    

