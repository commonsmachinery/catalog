
This is very early proof-of-concept work on the Commons Machinery metadata catalog. Nothing interesting here so far.

Requirements
============

* Python 2.7, virtualenv, pip
* RabbitMQ
* Node.js
* node-celery
* GCC to build Redis

The catalog uses celery and redis internally. Those are built and installed locally under build/backend

Deploying locally
=================

Run the following command to setup virtualenv under build/backend with all the required dependencies.

    sh ./bootstrap.sh

To enter virtualenv (set certain environment variables) use:

    source build/backend/bin/activate

Install the backend inside virtualenv:

    python backend/setup.py install

Run the backend:

     celery -A cmc_backend worker --loglevel=info

Run the frontend (in a separate window):

    cd frontend
    npm install node-celery (if required)
    node server.js

