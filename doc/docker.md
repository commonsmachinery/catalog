Deploying the catalog with Docker
=================================

Get started with Docker here, including installation instructions:
http://docs.docker.io/en/latest/use/basics/

There's currently a bug on Ubuntu/Debian in the default Docker setup
resulting in `Error resize: Error: bad file descriptor`.  Workaround:
https://github.com/dotcloud/docker/pull/4574


Pulling catalog images
--------------------------

Instead of building the catalog infrastructure images, they can be fetched from
the Docker index:

    docker.io pull commonsmachinery/backend-base
    docker.io pull commonsmachinery/rabbitmq
    docker.io pull commonsmachinery/redis
    docker.io pull commonsmachinery/mongodb
    docker.io pull commonsmachinery/postgres


Building catalog images
-----------------------

The backend dependencies are built into a base image, which can then
either be used as-is to run the backend manually, or used to build a
proper backend image.

    docker.io build -t commonsmachinery/backend-base docker/backend-base

The actual frontend and backend images can then be built:

    docker.io build -t commonsmachinery/backend backend
    docker.io build -t commonsmachinery/frontend frontend

We also have some infrastructure images:

    docker.io build -t commonsmachinery/rabbitmq docker/rabbitmq
    docker.io build -t commonsmachinery/mongodb docker/mongodb
    docker.io build -t commonsmachinery/redis docker/redis
    docker.io build -t commonsmachinery/postgres docker/postgres


Data image and container
------------------------

It is a good practice to store all data in dedicated volumes
associated with a data container, that the other containers can then
easily refer to.

Build the data image:

    docker.io build -t data docker/data

Then create a container for it:

    docker.io run -d --name=DATA data

The container is set up to run forever, so it is a bit harder to
remove it accidentially.  (It must be stopped first.)

The data volume can be inspected by running a temporary container that
uses it:

    docker.io run -t -i --rm --volumes-from=DATA ubuntu bash

It can be backed up like this:

    docker.io run --rm --volumes-from=DATA -v $(pwd):/backup busybox tar cvf /backup/backup.tar /data

Multiple data containers can be set up to handle different tests.
Remember to use the other container name in all the commands below.

Development usage
-----------------

Start the infrastructure containers:

    docker.io run --name=cat-mongodb -d -p 127.0.0.1:27017:27017 -p 127.0.0.1:28017:28017 --volumes-from=DATA commonsmachinery/mongodb
    docker.io run --name=cat-redis -d -p 127.0.0.1:6379:6379 --volumes-from=DATA commonsmachinery/redis
    docker.io run --name=cat-rabbitmq -d -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672 --volumes-from=DATA commonsmachinery/rabbitmq
    docker.io run --name=cat-postgres -d -p 127.0.0.1:5432:5432 --volumes-from=DATA commonsmachinery/postgres

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

    docker.io restart backend-dev
    docker.io logs -f backend-dev
    docker.io stop backend-dev

For some reason celery lists the loaded tasks in a way that they only
appear when the image is shut down, but "celery@xyz ready" should
indicate that it is running ok.

PostgreSQL (or SQLite) storage should be initialized manually by running backend/init_db.sh.
To run it in docker use the command:

    docker.io run -ti --rm -v "$PWD:/backend:rw" --volumes-from=DATA --env="init_db_mode=docker" --link=cat-postgres:postgres --entrypoint="/backend/init_db.sh" local/backend-dev

Production usage
----------------

TODO: describe infrastructure container deployment in production.  For
now, the development startup above should work.

TODO: handle account setup and configuration for production.

Start the backend:

    docker.io run -d \
        --name=backend \
        --volumes-from=DATA \
        --link=cat-mongodb:mongodb \
        --link=cat-rabbitmq:rabbitmq \
        --link=cat-redis:redis \
        --link=cat-postgres:postgres \
        commonsmachinery/backend


Start the frontend, listening and exposing port 80 (the base URL
should be set in a more stable way than this, but it's good enough for
now):

    docker.io run -d \
        --name=frontend \
        --link=cat-mongodb:mongodb \
        --link=cat-rabbitmq:rabbitmq \
        --link=cat-redis:redis \
        -e "CATALOG_BASE_URL=http://$HOSTNAME" \
        -p 80:8004 \
        commonsmachinery/frontend


Useful commands
---------------

List available images:

    docker.io images

List running containers (add `-a` to see inactive too):

    docker.io ps
    

