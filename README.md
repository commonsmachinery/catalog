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

REST API
--------

List works:

    curl -H 'Accept: application/json' http://localhost:8004/works

Filter works:

    curl -H http://localhost:8004/works?visibility=public

Create a work (the subject in the metadata will be rewritten to the
generated subject):

    curl -v -X POST -d '{"visibility":"public", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "Example Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' http://localhost:8004/works

Get a work:

    curl -H 'Accept: application/json' http://localhost:8004/works/1392318412903

Update a work:

    curl -X PUT -d '{"state":"published", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "New Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' -H 'Accept: application/json' http://localhost:8004/works/1392318412903

Delete a work:

    curl -v -X DELETE http://localhost:8004/works/1392318412903

Add a source:

    curl -v -X POST -d '{"metadataGraph": { "about:resource": { "http://purl.org/dc/terms/provenance":[{"value":"Old Conditions Here","type": "literal"} ] } } }' -H 'Content-type: application/json' http://localhost:8004/works/1392318412903/sources

Update a source:

    curl -X PUT -d '{"metadataGraph": {"about:resource": {"http://purl.org/dc/terms/provenance":[{"value":"New Conditions Here","type": "literal"}]}}}' http://localhost:8004/works/1392318412903/sources/1

Add post:

    curl -v -X POST -d '{"resource":"http://example.com/post1"}' -H 'Content-type: application/json' http://localhost:8004/works/1392318412903/posts

Delete source or post:

     curl -v -X DELETE http://localhost:8004/works/1392318412903/sources/12345
     curl -v -X DELETE http://localhost:8004/works/1392318412903/posts/12345

Query SPARQL endpoint:

    curl -g -H 'Accept: application/json' 'http://localhost:8004/sparql?query=SELECT+?s+?p+?o+WHERE+{?s+?p+?o}+LIMIT+50'
