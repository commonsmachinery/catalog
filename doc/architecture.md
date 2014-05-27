
Catalog architecture
====================

The catalog uses an CQRS-based architecture, with a frontend handling
commands and backend tasks processing the changes into various
query-oriented databases.

See architecture.svg/png for an overview.


Catalog components
==================

Frontend
--------

The frontend is responsible for providing an interface to the catalog
for the surrounding world.

Main responsibilities:

* Web pages and REST API to view and edit information in the catalog,
  updating the main database
* Logging all changes in an event log
* Publishing information about events to backend tasks
* Persona.org user authentication and session management
* OAuth 2.0 authentication and session management for tool plugins and
  third-party clients
* Interfacing with external OAuth-like services (e.g. Twitter) to get
  credentials to access user accounts there

The web pages and the REST API are overlaid on the same URIs, using
the HTTP Accept header to determine what to respond.

Since the frontend is responsible for facing the world, it is also
responsible for creating the URIs that identify the resources managed
by the catalog.  These URIs include the MongoDB ObjectIDs that
identify the objects in the main database.

### Technology

* Node.js
* Express web app
* Jade templates with Stylus CSS processing
* Backbone.js to create/update works etc on the web pages
* Backbone.Modelbinder to link models to the DOM


Backend tasks
-------------

The backend tasks run in the background to update the query-oriented
databases, as well as sending out notifications and other
non-interactive tasks.

The tasks are driven primarily by subscribing to events published by
the frontend.  These events are primarily triggers, and the system
shall handle a non-reliable message transport.

The tasks generally have to query the event log and the main database
to figure out what to do, if it is important that they handle changes
where the messages might be lost on the way between the frontend and
the backend.  A task could be a simple process, or a Celery app that
uses the messages from the frontend to trigger new tasks.

### Technology

Probably:

* Python 2 (should be 3 when Redland supports it)
* Celery
* Redland (for any RDF processing)


Databases
---------

The main database stores the full data model: works, media, users,
groups, organisations.

The event database stores an event log, both for audit purposes, and
to let backend tasks know about all changes in the frontend.

Query databases allow more complex views of the data to be processed,
e.g. a view that correlates all Work objects that have some Media in
common and what their collective annotations look like.


Infrastructure
==============

The catalog should be possible to deploy in Docker environments or on
a Platform-as-a-Service (PaaS).

Main databases
--------------

MongoDB is a widely used document store, which is a very good fit to a
Node frontend.  Great support in PaaS services, and can handle very
large datasets.

It will be used primarily for the main database, the event log, and to
store web sessions.  It may also support some of the query databases.


Messaging
---------

Good candidate: ZeroMQ.  This is simple to use and allow deployments
even without message router but direct communication between frontend
and backend tasks (though in production there are configuration
benefits to having a simple router).

Alternatively a memory-only Redis server can be used.  This has the
benefit that it could then also be used by Celery tasks in the backend.


Caching
-------

If any cluster-wide caching is required, a memory-only Redis server
would be a good choice.  However, we probably can do with node-only
caches.


RDF store
---------

Any query databases that benefit from RDF processing can initially be
Postgres-backed Redland stores.  For more complex cases later, a
dedicated graph store might be preferable.
