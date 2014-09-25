This is very early proof-of-concept work on the Commons Machinery metadata catalog. Nothing interesting here so far.

Requirements
============

* Node.js
* MongoDB
* ZeroMQ


Installing prerequisites
------------------------

On Ubuntu 14.04:

    sudo apt-get install build-essential nodejs npm libzmq3-dev

Docker
------

It is recommended to run at least MongoDB in a Docker image during
development.  In production all parts should be run in Docker (or on a
PaaS).  For details, see `doc/docker.html`.

Configuration
-------------

See `doc/config.md` for documentation. Default settings currently work
for local/development setups.

Using
=====

Run `./setup_devenv.sh` in the top dir to install all dependencies.

Run `make` to build the CSS files necessary for the web interface.

There are a number of entry points to different parts of the system,
see `doc/codestructure.md`.

To just run the full catalog frontend and all backend tasks, run
`main.js` in the top directory.  It can be started with suitable env
vars for development like this:

    BLUEBIRD_DEBUG=1 DEBUG='catalog:*' NODE_ENV=development nodejs main.js


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

The API is documented here: http://docs.cmcatalog.apiary.io/

All `PUT`, `POST` and `DELETE` require a valid user session (see above
about development accounts).  `GET` will return publically visible
information without any session.

Here are some useful curl commands to poke the API:

Find out current user:

    curl -k -v -u test: -X GET http://localhost:8004/users/current

Get user profile:

    curl -k -v -u test: -H 'Accept: application/json' -X GET http://localhost:8004/users/53a80969b22cfae451ec8ed4

Update user profile:

    curl -k -v -u test: -d '{"alias":"new alias"}' -H 'Content-Type: application/json' -X PUT http://localhost:8004/users/53a80969b22cfae451ec8ed4


### Old API, move stuff out of here as it is replaced

List works:

    curl -H 'Accept: application/json' http://localhost:8004/works

Filter works:

    curl -H http://localhost:8004/works?visible=public

Create a work (the subject in the metadata will be rewritten to the
generated subject):

    curl --user test: -v -X POST -d '{"visible":"public", "metadataGraph": { "about:resource": { "http://purl.org/dc/terms/title": [ { "value": "Example Title", "type": "literal" } ] } } }' -H 'Content-type: application/json' http://localhost:8004/works

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
