This is very early proof-of-concept work on the Commons Machinery metadata catalog. Nothing interesting here so far.

Requirements
============

* Python 2.7, virtualenv, pip
* RabbitMQ
* Node.js
* GCC (to build Redis)
* Redland

The catalog uses celery and redis internally. Those are built and installed locally under build/backend

Installing prerequisites
------------------------

On Ubuntu:

    sudo apt-get install rabbitmq-server python-virtualenv build-essential python2.7-dev librdf0-dev librdf-storage-sqlite swig autoconf automake libtool curl

Make sure that Node.js is installed to run the frontend.


Docker
------

There are docker images to help run the catalog.  For details, see `doc/docker.html`.

Deploying locally
=================

Run the following command to setup virtualenv under build/backend with all the required dependencies.

    sh ./bootstrap.sh

Local store (sqlite) will be initialized from bootstrap.sh, and can be re-created later by running

    ./init-sqlite.sh

Running
-------

All the components can be started by just running `./run_local.sh`.

Data and event log will be saved under `./data/db` which is created by
`run_local.sh` if it doesn't already exist.

To run the backend manually:

    mkdir -p data
    export CATALOG_DATA_DIR="$PWD/data"
    
    cd backend
    ../build/backend/bin/celery -A catalog worker --loglevel=info

To run the frontend manually:

    cd frontend
    node server.js


Using
=====

User accounts
-------------

The primary login mechanism on the web pages is Mozilla Persona:
https://login.persona.org/

For testing the mocked IDs from https://mockmyid.com/ can be used:
simply login with `something@mockmyid.com`, if you don't want to use a
real email adress.

When the frontend is run in development mode there are also simple
test accounts that doesn't require any password at all.  Either login
on the web page or pass `--user test:` to curl (choosing whichever
username you need).  For these test accounts, a faked email address
`user@test` is created.

TODO: OAuth access to the REST API.


REST API
--------

All `PUT`, `POST` and `DELETE` require a valid user session (see above
about development accounts).  `GET` without a session queries the
public store, and when a session is available it queries the main
store applying the access rules.


List works:

    curl -H 'Accept: application/json' http://localhost:8004/works

Filter works:

    curl -H http://localhost:8004/works?visibility=public

Create a work (the subject in the metadata will be rewritten to the
generated subject):

    curl --user test: -v -X POST -d '{"visibility":"public", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "Example Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' http://localhost:8004/works

Get a work:

    curl --user test: -H 'Accept: application/json' http://localhost:8004/works/1

Update a work:

    curl --user test: -X PUT -d '{"state":"published", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "New Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' -H 'Accept: application/json' http://localhost:8004/works/1

Delete a work:

    curl --user test: -v -X DELETE http://localhost:8004/works/1

Add a source:

    curl --user test: -v -X POST -d '{"metadataGraph": { "about:resource": { "http://purl.org/dc/terms/provenance":[{"value":"Old Conditions Here","type": "literal"} ] } } }' -H 'Content-type: application/json' http://localhost:8004/works/1/sources

Update a source:

    curl --user test: -X PUT -d '{"metadataGraph": {"about:resource": {"http://purl.org/dc/terms/provenance":[{"value":"New Conditions Here","type": "literal"}]}}}' -H 'Content-type: application/json' -H 'Accept: application/json' http://localhost:8004/works/1/sources/1

Add post:

    curl --user test: -v -X POST -d '{"resource":"http://example.com/post1"}' -H 'Content-type: application/json' http://localhost:8004/works/1/posts

Update post:

    curl --user test: -X PUT -d '{"resource": "http://example.com/other_post"}' -H 'Content-type: application/json' -H 'Accept: application/json' http://localhost:8004/works/1/posts/1

Delete source or post:

     curl --user test: -v -X DELETE http://localhost:8004/works/1/sources/1
     curl --user test: -v -X DELETE http://localhost:8004/works/1/posts/1

Query SPARQL endpoint:

    curl -g -H 'Accept: application/json' 'http://localhost:8004/sparql?query=SELECT+?s+?p+?o+WHERE+{?s+?p+?o}+LIMIT+50'
