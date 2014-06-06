
Catalog architecture
====================

The architecture of the catalog is a compromise between something that
can be built reasonably quickly, but still easily add additional
functionality and scaling improvements later.

In development it should be possible to run as a single process, or a
very small number of processes, but in production to be deployed with
processes dedicated to specific tasks or functions.

The catalog should allow scaling to handle larger loads, either via
parallel identical instances or by sharding.

Functions that cannot be parallelised should enable reliability by
switching from a master to a slave instance, if they are critical to
the operation of the system.


Overview
--------

[Architecture diagram](architecture.png)

A frontend handles all requests from clients or third-party users,
relying on a set of modules to handle each query.

These modules typically consist of:

* An interface for the frontend to the stored data, containing any
  business logic

* A data model, stored as a set of collections in a MongoDB database

* Backend tasks that perform data updates or other actions based on
  events triggered from the frontend or other backend tasks.

Each module can be tested in isolation.

The backend tasks share common infrastructure to handle event
processing, so the tasks can focus on the business logic.

An event module sits between the frontend and the backend.


Data
----

The catalog is centered around a core module whose data model is
stored in a MongoDB database.  These objects are created and updated
by users of the catalog, and also are queried for basic access.

A CQRS architecture allow more complex functionality to be handled by
separate modules supporting specific read patterns.  This includes:

* Search: Full-text and URI searches
* View: Denormalisations to speed up web views of the data

A later module is expected to handle correlations and aggregation of
metadata between works.


Events
------

All commands in the core module generates events, which are fed into
the other modules to update their data models.

Event sourcing is not used now, but the design is intended to enable
the core module to be rewritten later to use it.  For now, the update
of the core objects in the database is the primary action, event
emitting secondary.

The events also serve the purpose of an audit log.


Catalog components
==================

Frontend
--------

The frontend is responsible for providing an interface to the catalog
for the surrounding world.  The web pages and the REST API are
overlaid on the same URIs, using the HTTP Accept header to determine
what to respond.

A typical request would first check with the auth module that the user
isn't locked and find out what groups the user belongs to.  The core
module is then called, with this information, to perform any updates.
To generate a response, data from the core module is used, potentially
helped by the view and search modules.

Since the frontend is responsible for facing the world, it is also
responsible for creating the URIs that identify the resources managed
by the catalog.  These URIs include the MongoDB ObjectIDs that
identify the objects in the main database.


Admin
-----

The admin interface is a separate small web app, which allows site
administrators to manage users and get access to the catalog data in a
controlled manner.


Core
----

The core module defines the central data model of the catalog, and is
responsible for implementing the business logic related to accessing
and updating the objects.  All data modifications result in a set of
events being generated.

Backend tasks mainly perform database maintenance, verifying integrity
and garbage collecting superfluous objects.


Auth
----

The auth module handles all aspects of user authentication and
authorization to access the system as a whole.  Authorization to
access specific data objects are handled by the core module, based on
identity and group membership information provided by the auth module
via the frontend.

The auth module generates security-related events, such as logins,
failed accesses, account locks etc.

Backend tasks consume these events to e.g. lock accounts after
repeatedly failed accesses.


View
----

The view module provides denormalisations of the core data module to
help the frontend render web page responses.  It also contain
information only relevant to web pages, e.g. view counts.

It will initially do very little in the beginning of the project.  The
frontend will instead do the legwork in assembling the information
from the core module, which can later be taken over by the view module
as needed.

Backend tasks will update the view denormalisations based on core
events.


Search
------

The search module supports locating objects based on URIs or full-text
searches, relying on MongoDB indexes.

Most of the work will be done by background tasks that updates the
search database based on core events.


Event
-----

The event module handles the details around event processing to let
the other modules emit and consume events, providing code libraries
that handle all the details described below.

The provisional design is that each emitting module has its own event
log collection in the same MongoDB instance as the corresponding data.
This means that it is very unlikely that writing the events should
fail if the immediately preceding object write succeeded.  This level
of reliability should be sufficient for this application.  If a write
anyway fails, the events are logged to a file instead and an alarm
raised.  This may even trigger a lock on the entire system to prevent
further modifications.

The events are published in the background to the subscribers via
ZeroMQ.  (An alternative is to use a MongoDB capped collection with
tailing cursors.  The benefit is that the MongoDB instance becomes the
single synchronisation point between producers and consumers, avoiding
the need for an event broker component in more complex setups.  The
support for this in various languages and the performance must be
evaluated, though.)

The events are periodically transferred by tasks in the event module
into an archival log.  This archive aggregate events into time
period-specific collections, e.g. for a full a year or a month.

Event publishing is not required to be reliable.  Consumers who must
rely on correct event order and on not missing any events must keep
track of the received events and when necessary get the missing ones
from the event log.


Technology
==========

The catalog should be possible to deploy in Docker environments or on
a Platform-as-a-Service (PaaS).

Frontend
--------

* Node
* Express 4 web app
* Jade templates with Stylus CSS processing
* Backbone.js to create/update works etc on the web pages


Backend tasks
-------------

To be decided.  Likely Node, to be able to share libraries with the
frontend.  Either a homegrown simple event-driven task framework, or a
suitable library.


Databases
---------

MongoDB is a widely used document store, which is a very good fit to
Node.  Great support in PaaS services, and can handle very large
datasets.


Messaging
---------

ZeroMQ, or MongoDB capped collection with tailing cursors.


Caching
-------

Any in-memory caching should primarily be within the processes, with
the help of some cluster cache library to evict data on changes.  To
be investigated when the need arises.

It is not expected that cluster-wide caching will be needed, but if it
is a memory-only Redis server would be a good solution.

