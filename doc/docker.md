Deploying the catalog with Docker
=================================

Pulling catalog images
--------------------------

Instead of building the catalog infrastructure images, they can be fetched from
the Docker index:

    docker.io pull commonsmachinery/mongodb


Building catalog images
-----------------------

A single catalog image is built, which can then run different main.js
depending on the command line arguments.  Build it in the top dir:

    docker.io build -t commonsmachinery/catalog .
    
If necessary, the infrastructure images can be rebuilt like this:

    docker.io build -t commonsmachinery/mongodb docker/mongodb


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

    docker.io run -t -i --rm --volumes-from=DATA commonsmachinery/ubuntu bash

It can be backed up like this:

    docker.io run --rm --volumes-from=DATA -v $(pwd):/backup busybox tar cvf /backup/backup.tar /data

Multiple data containers can be set up to handle different tests.
Remember to use the other container name in all the commands below.


Development usage
-----------------

Start the infrastructure containers:

    docker.io run --name=cat-mongodb -d -p 127.0.0.1:27017:27017 -p 127.0.0.1:28017:28017 --volumes-from=DATA commonsmachinery/mongodb

In development you usually want to run the catalog in the host
environment, so `-p` here forwards the container ports to `localhost`
so it is accessible as if MongoDB was installed and running directly
in the host system.

Admin REST/web interfaces can be accessed on these URLS:

* MongoDB: http://127.0.0.1:28017/


Production usage
----------------

TODO: describe infrastructure container deployment in production.  For
now, the development startup above should work.  The `-p` arguments
can be dropped though, if you don't want to expose the ports directly.

Start the catalog as a background docker container, exposing the HTTP
port.  The base URL must be set to the externally visible URL.  The
following example just uses the hostname:

    docker.io run -d \
        --name=catalog \
        --link=cat-mongodb:mongodb \
        -e "CATALOG_FRONTEND_BASE_URL=http://$HOSTNAME:8004" \
        -e 'DEBUG=catalog:*' \
        -e 'NODE_ENV=development \
        -p 8004:8004 \
        commonsmachinery/catalog all

An argument must be given to control which component to run.  `all`
runs the top-level `main.js`, which includes the full web frontend and
all backend tasks in a single process.  In more typical production use
you'd separate each component into its own containers and machines.
Valid component paths are listed in `doc/codestructure.md`.

The example also sets env vars to enable debug output and run it as a
dev environment.


Useful commands
---------------

List available images:

    docker.io images

List running containers (add `-a` to see inactive too):

    docker.io ps
    

Obsolete info
=============

An older version of the catalog depended on more infrastructure.  In
case this becomes useful again, here is the info about them.

Pulling the images:

    docker.io pull commonsmachinery/rabbitmq
    docker.io pull commonsmachinery/redis
    docker.io pull commonsmachinery/postgres

Building the images:

    docker.io build -t commonsmachinery/rabbitmq docker/rabbitmq
    docker.io build -t commonsmachinery/redis docker/redis
    docker.io build -t commonsmachinery/postgres docker/postgres

Running the containers:

    docker.io run --name=cat-redis -d -p 127.0.0.1:6379:6379 --volumes-from=DATA commonsmachinery/redis
    docker.io run --name=cat-rabbitmq -d -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672 --volumes-from=DATA commonsmachinery/rabbitmq
    docker.io run --name=cat-postgres -d -p 127.0.0.1:5432:5432 --volumes-from=DATA commonsmachinery/postgres

Admin interfaces:

* RabbitMQ: http://127.0.0.1:15672/ (guest/guest)
