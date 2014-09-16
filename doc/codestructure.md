
Code structure
==============

Directories
-----------

* `config`: configuration files (template and env-specific)
* `lib`: common code
* `frontend/catalog`: fully-featured public web frontend
* `frontend/catalog/public/app`: browser-side code
* `frontend/catalog/views`: Jade page templates
* `frontend/index`: read-only REST API, intended for URI lookups
* `frontend/lib`: common code to the frontends, mainly the REST endpoints
* `modules/core`: Core data model
* `modules/event`: Event processing
* `modules/auth`: Auth module
* `apitest`: REST endpoint test script
* `docker`: Dockerfiles for catalog images ([more info](docker.md))


Building etc
------------

`make all` will lint all javascript code, build CSS files etc.

`make test` will run any unit tests.

`make clean` will remove built files.

`make apitest` will run the REST endpoint test script.


Server entrypoints
------------------

Each module which may be run as a standalone process has a `main.js`
for that purpose.

The top-level `main.js` will run all modules (except `frontend/index`)
in a single Node process, which is useful for development.

Current entrypoints:

* `frontend/catalog`: The web server providing the REST API and the
  user-facing web pages.
* `frontend/index`: GET-only REST API, primarily for rest lookups
* `modules/core`: Core backend tasks.
* `modules/event`: Event transfer backend task.
