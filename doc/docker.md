Deploying the catalog with Docker
=================================

Get started with Docker here:
http://docs.docker.io/en/latest/use/basics/

Getting third-party images
--------------------------

We don't use many third-party images directly.  This one is only
needed if you want to build run the frontend in a container in
development mode:

    sudo docker pull dockerfile/nodejs


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

Multiple data containers can be set up to handle different tests.
Remember to use the other container name in all the commands below.


Development usage
-----------------

Start the infrastructure containers:

    sudo docker run --name=cat-mongodb -d -p 127.0.0.1:27017:27017 -p 127.0.0.1:28017:28017 --volumes-from=DATA commonsmachinery/mongodb
    sudo docker run --name=cat-redis -d -p 127.0.0.1:6379:6379 --volumes-from=DATA commonsmachinery/redis
    sudo docker run --name=cat-rabbitmq -d -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672 --volumes-from=DATA commonsmachinery/rabbitmq

In development you might want to run the frontend and backend in the
host environment, so `-p` here forwards the container ports.  The
frontend and backend can then be run directly as if the infrastructure
was running on the host directly.

Admin REST/web interfaces can be accessed on these URLS:

* MongoDB: http://127.0.0.1:28017/
* RabbitMQ: http://127.0.0.1:15672/ (guest/guest)


### Running frontend and backend in docker

Instead of building full containers for the backend and frontend, or
running in the host, you can run development containers that directly
uses the source code and properly links into the infrastructure
containers.

Node keeps all the dependencies locally in `node_modules` for the
frontend, so if you have node installed already you can just install
the dependencies directly:
    
    cd frontend
    npm install
    ./volo_add.sh
    
Or do that via a the `dockerfile/nodejs` image:

    ./frontend/docker_npm_install.sh
    
To run the frontend in a docker image, fully linked to the
infrastructure images, do:

    ./frontend/docker_nodemon.sh

That will run the frontend attached to the terminal, so Ctrl-C will
shut it down.

The backend needs to run as a permanent container, since it's tricky
to combine Python virtualenvs with the containers.  This is all set up
by running this script:

    sudo backend/setup_docker_dev.sh

The scripts creates an image running celery, using the backend code in
the source directory.  It will auto-reload changed files.

The images will store events in MongoDB, and use the BDB Redland store
in /data/backend/data from the DATA container. 

Useful commands for managing the backend:

    sudo docker restart backend-dev
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
    

