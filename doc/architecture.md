
Catalog architecture
====================

!(architecture.svg)

Catalog components
==================

Frontend
--------

The frontend is responsible for providing an interface to the catalog
for the surrounding world.

Main responsibilities:

* Web pages to view and edit information in the catalog
* REST API for tool plugins and third-party clients
* Persona.org user authentication and session management
* OAuth 2.0 authentication and session management for tool plugins and
  third-party clients
* Interfacing with external OAuth-like services (e.g. Twitter) to get
  credentials to access user accounts there

The web pages and the REST API are overlaid on the same URIs, using
the HTTP Accept header to determine what to respond.

Since the frontend is responsible for facing the world, it is also
responsible for creating the URIs that identify the resources managed
by the catalog.  This is primarily done when creating a new resource
(e.g. a work) by POSTing to REST endpoint, by assigning an ID to the
resource and creating a resource URI with that ID that can later be
used to GET information about the resource.  The counters for the IDs
are stored in the cluster data.

The frontend doesn't do any other processing of the information about
resources in the catalog, but passes on all requests as Celery tasks
to the backend through the messaging layer.

Profile information, sessions etc for Persona, OAuth, Twitter etc are
stored in a profile database.  This is different from the users public
profile, which is stored as RDF with foaf predicates in the RDF store.

### Technology

* Node.js
* Express web app
* Jade templates
* Backbone.js to create/update works etc on the web pages


Backend
-------

The backend is responsible for managing the resources stored in the
catalog, and any related processing such as sending out notifications.

Main responsibilities:

* Storing resources in two RDF stores: a main internal store and a
  separate store containing only public information
* Recording all resource modifications in an event log
* Sending out notifications (primarily on publish events)

The frontend call Celery tasks in the backend to created, updated or
delete resources.  The backend task will both update the RDF store,
and log the event with the resulting state of the resource in the
event log DB.  

Other celery tasks provide an interface to access the resources,
called by the frontend when information is requested by endpoint
users.

The backend must ensure that two tasks doesn't attempt to update one
resource at the same time.  To do that, the tasks use the cluster data
to lock the resource while working on it.  If a resource is locked
when a second task attempt to work on it, it will hand the task back
to Celery to be retried in a moment.

### Technology

* Python 2 (should be 3 when Redland supports it)
* Celery
* Redland


Infrastructure
==============

This section lists the products that are intended to be used in the
first deployments of the catalog.

The code should avoid to be tied to particular databases or message
brokers, to make it easier to deploy in different environments or
scales.

This means that the code that interfaces a particular infrastructure
should either use a third-party library that support different
solutions (e.g. Redland for the RDF store), or be modularised so
another module can be developed in the future.

The catalog is primarily intended to be hosted in a
Platform-as-a-Service (PaaS) environment, which influences the
infrastructure choices.


Messaging
---------

RabbitMQ: the only message broker with really good support in Celery.

RabbitMQ is supported by Heroku, but for Openshift we must develop our
own third-party cartridge.


Cluster data
------------

Redis: in-memory database, persisted to disk.  Handles counters, locks
(through SETNX), sessions, temporary data etc that must be shared
across the nodes in the catalog cluster.  A single instance may be
used for both the frontend and the backend, but it should not be used
to share data between the frontend and the backend.

Redis is supported by HEroku, and with a third-party cartridge in
Openshift.


Profile database
----------------

MongoDB: a document store with indexing should be a good fit for
store the user information necessary for authentication to/with
third-party services and tools.  Web sessions might be stored here
too, instead of in Redis.

All this information should be kept out of the RDF Store, to reduce
the risk that it is exposed with the catalog resource information.

MongoDB is supported out of the box by Openshift and Heroku.


RDF store
---------

Postgres: backend to Redland, primarily because it is supported in
Openshift and Heroku.  

Later we might want to look at a dedicated store such as Virtuoso.


Event log database
------------------

MongoDB: a document store is a very good fit for events with a JSON
payload.  Indexes will support finding events by resource and time.


