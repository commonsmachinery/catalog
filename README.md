This is the Commons Machinery metadata catalog. It stores Media Annotations
(metadata) for creative works and supports lookup by URI or by perceptual
hashes (for images).

Requirements
============

* Node.js
* MongoDB
* ZeroMQ


Installing prerequisites
------------------------

On Ubuntu 14.04:

    sudo apt-get install build-essential nodejs npm libzmq3-dev libkyotocabinet-dev kyotocabinet-utils


MongoDB
-------

You need to have a MongoDB for the Catalog to strore its data. It's recommended
run MongoDB in a Docker image during
development.  In production all parts should be run in Docker (or on a
PaaS).  For details, see `doc/docker.html`.

If you're just testing things out, you can simply install MongoDB in your
regular system. Please do note that MongoDB is limited to 2GB databases on
32-bit systems. A 64-bit system is highly recommended! To install MongoDB
on Ubuntu 13.10 and 14.04:

    sudo apt-get install mongodb-server

HmSearch Database
-----------------

The searches for perceptual hashes uses hmsearch, which is available from
http://github.com/commonsmachinery/hmsearch and the Catalog expects an
initialised database in its root folder with the name hashes.kch.
Follow the installation instructions from hmsearch to create this database
and place it in the Catalog folder.


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

Current development is focused on the frontend index.  It can be
started with suitable env vars for development like this:

    BLUEBIRD_DEBUG=1 DEBUG='catalog:*' NODE_ENV=development nodejs frontend/index/main.js

To run the full (very much work-in-progress) catalog frontend and all
backend tasks in a single process, run `main.js` in the top directory.

    BLUEBIRD_DEBUG=1 DEBUG='catalog:*' NODE_ENV=development nodejs main.js


Installing sample data
----------------------

`doc/example-works.txt` contain a list of 100 works from Wikimedia Commons
that can be used as sample data. The list of works is in the Data Package
specification, which can be found in `doc/datapackage.md`. To load the sample
data into the database, you need to import the data package, and then 
populate the search catalog.

To import the data package, you must specify to which user the imported
works should be assigned. If you're running the Catalog in development
mode, you can also create a fake test user account. You can get the
identifier of your account by running the following command. This will
create a test user if it doesn't already exist:

    curl -u test: -X GET http://localhost:8004/users/current

This command will return something like this:

    Moved Temporarily. Redirecting to http://localhost:8004/users/542af1de876096426387c9a1

Where the hash at the end of the string represents the identifier of the
user. This is what you'll now use to load the sample works, calling on
`modules/core/scripts/load.js` to do the job. Replace the user identifier
below with the identifier from your own installation:

    nodejs modules/core/scripts/load.js --user 542af1de876096426387c9a1 doc/example-works.txt

To populate the search you similarly use
`modules/core/scripts/populate-search.js`, passing a data as an argument. The
data represents the first date from which to process Works. You can set this
to any historical date to process all Works that you just imported:

    nodejs modules/core/scripts/populate-search.js --date "1990-01-01"


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

Click on the double downward arrows to expand each call showing
example usage as plain JSON or in various programming languages.

All `PUT`, `POST` and `DELETE` require a valid user session (see above
about development accounts).  `GET` will return publically visible
information without any session.

The web and REST endpoints are overloaded on the same paths, so to get
a REST response to a `GET` request you must set the `Accept` header to
`application/json`.

Here are some useful curl commands to poke the API:

Find out current user:

    curl -k -v -u test: -X GET http://localhost:8004/users/current

Get user profile:

    curl -k -v -u test: -H 'Accept: application/json' -X GET http://localhost:8004/users/53a80969b22cfae451ec8ed4

Update user profile:

    curl -k -v -u test: -d '{"alias":"new alias"}' -H 'Content-Type: application/json' -X PUT http://localhost:8004/users/53a80969b22cfae451ec8ed4


List works:

    curl -H 'Accept: application/json' http://localhost:8004/works


Get a work:

    curl --user test: -H 'Accept: application/json' http://localhost:8004/works/542af1de876096426387c9a1


