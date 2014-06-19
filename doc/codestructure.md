
Code structure
==============

Directories
-----------

* `config`: configuration files (template and env-specific)
* `lib`: common code
* `frontend`: public web frontend
* `frontend/public/app`: browser-side code
* `frontend/views`: Jade page templates
* `modules/core`: Core data model
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

The top-level `main.js` will run all modules in a single Node process,
which is useful for development.
