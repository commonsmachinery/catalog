This is very early proof-of-concept work on the Commons Machinery metadata catalog. Nothing interesting here so far.

Requirements
============

* Python 2.7, virtualenv, pip
* RabbitMQ
* Node.js
* node-celery
* GCC (to build Redis)
* Redland and Python bindings for Redland

The catalog uses celery and redis internally. Those are built and installed locally under build/backend

Deploying locally
=================

Run the following command to setup virtualenv under build/backend with all the required dependencies.

    sh ./bootstrap.sh

To enter virtualenv (set certain environment variables) use:

    source build/backend/bin/activate

Install the backend inside virtualenv:

    cd backend
    python setup.py install

Run redis:

    cd ..
    build/backend/bin/redis-server

It's also possible to use Redis that has been previously installed in the system. The default configuration will dump the database every 15 mins into a file called `dump.rdb` in the current directory.

Run the backend:

     celery -A cmc_backend worker --loglevel=info

Run the frontend (in a separate terminal window):

    cd frontend
    npm install node-celery (if not already installed)
    node server.js

