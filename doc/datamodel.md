**This is work-in-progress, so not all properties are documented yet
here.  See datamodel.png for the full list.**


Main datamodel
==============

The main datamodel handles all core CRUD operations, and is the source
for aggregations into query databases.

The objects are stored as documents in a MongoDB database, using
ObjectIDs to identify objects both in the store and in URLs.

See `datamodel.png` (original UMLet file is `datamodel.uxf`) for an
overview, and object properties not yet listed in this document.


Key concepts
------------

- The W3C Ontology for Media Resources is used as a core metadata
  model (see more under Annotation below).

- All ID generation is handled by the MongoDB ObjectIDs.

- All top-level objects can be updated atomically: if there are
  simultaneous modifications of a single document only one will
  succeed, and the others will fail and can be retried after taking
  the new data into account.

- ObjectIDs are translated into full REST API endpoint URLs by the
  frontend when sending objects to clients as JSON.

- Objects which may be referred to from other data sets by their URI
  store this uri, as a backup to being wholly dependent on the REST
  API endpoint.


Entry
-----

All main objects incorporate common base properties.

Key properties:

`_id`: Unique ID, assigned via an ObjectID

`nonce`: Used to detect conflicting updates (see example here:
http://docs.mongodb.org/ecosystem/use-cases/metadata-and-asset-management/) 


Work
----

Work is the central concept in the catalog.  It's focusing on works as
an abstract concept - actual instances of it are represented as Media
objects.

All information about the work is embedded into the MongoDB document,
except for the Media instances which are referenced to from a list.

The rationale is that the work information is a whole and should be
updated as such, but the Media instances mainly serves as a source of
the information that ends up in the Work.  Not embedding the much
more static information in the Media instance will reduce the impact
on data updates in the Work document.

Key properties:

`owner`: User or Organisation owning the Work object (which doesn't
imply any kind of copyright ownership).  The user owning the object
or the admins of the organisation are always allowed to edit a work.

`description`: Catalog-internal notes about this work, mainly for the
user's own purposes.  Not considered work metadata.

`annotations`: The work metadata (see Annotation below).  This is an
object where the keys are annotation types, and the values are lists
of Annotations for that time.  The catalog should keep the "most
useful" item first, so client code just use
e.g. `work.annotations.locator[0].value` when just one value is
needed.

`sources`: List of sources as embedded documents.

`embed`: work embedding/preview information, essentially just an
oEmbed response object embedded in the document.  For e.g. an image
published on flickr, this would contain the flickr-provided
thumbnail information.

`media`: List of object ID references to Media instances of this
work.


Annotation
----------

The W3C Ontology for Media Resources (OMR) provide a core set of metadata
properties, or _annotations_, with normalisation rules from a number
of metadata standards: http://www.w3.org/TR/mediaont-10/

This gives us a nice framework for processing metadata into a common
model that we can more easily manipulate than generic RDF.  The price
is losing the depth of information that RDF allows, but in practice we
will not be able to make that understandable for users who are now
semantic web academics.

We can add additional properties to this core set when we need it.

Some key annotation types will be:

- `id`: anything identifying a work, typically structured as URIs.
  These may be a web address to e.g. a flickr photo page, a
  `magnet:` link indicating a hash, or some kind of fingerprint.  A
  work or media might have several different ID annotations, implying
  different ways of identifying the abstract work.

- `locator`: where the work or media instance can be found, typically
  a URL.  Here too there may be multiple URLs.

- `title`: name of the work.

- `policy`: CC license information.


Annotation object properties:

`_id`: ObjectID for the annotation, to make it easier to refer to it
  in the REST API.

`value`: The value specified by OMR in section 5.1:
http://www.w3.org/TR/mediaont-10/#core-property-definitions  Either a
simple value or an embedded object, depending on the property.

`updatedBy`: only included if the latest update was by someone else
than the user who added the Work record (note: not the owner User).

`updatedDate`: when this record was updated, if omitted
Work.addedDate should be used instead.

`score`: a metadata reliability score from 0-100.  0 means that the
annotation should be hidden from the users, and is an alternative to
deleting data outright. How this score is set is not in the scope of
this document.


Source
------

A Source just links a "remix" work to the source works that it derived
from.

**TODO:** There probably should be some scope to capture how the works
are related in this source object - the provenance - but that can be
decided later.


Media
-----

A representation of a work is referred to as a Media instance in this
data model.  It can represent a particular file, or a web page where
the work is available.

Typically a Media object is created once, and then only rarely
modified (perhaps they should be readonly?).  If the information is
edited, that should instead be done when it is incorporated into the
Work annotations.

`annotations`: the annotations about this Media instance, typically
derived from the file/page metadata.

`embed`: any oEmbed/OpenGraph information fetched about this instance.

`metadata`: raw metadata captured about this object, stored as an
embedded document. Maps from different types of metadata to the
information in a suitable format (e.g. RDF/JSON for `rdf` and an XML
string for `xmp`).


Access
------

Simple list of users and groups who have particular access to a Work
or a Collection.  Always stored as an embedded document into the main
object.


Collection
----------

A collection of Work objects.  Works do not have to be part of any
collection, but it helps organising them.

Read access implies listing which works are included, and write access
to add or remove works from the collection.  The actual work access is
then controlled by the Work access information.


Organisation
------------

Similar to a Github organisation, these objects are used to organise
groups of people who collaborate on works or collections.


User
----

Contains both technical data needed to handle user access to the
catalog, as well as their public profile.

Also like Github, users are their own identities and do not have to be
associated with an Organisation.

User properties:

`emails`: List of email addresses associated with this user account.
The primary address that is used for communication is always first in
the list.  The list cannot be empty.

`profile`: Public profile.  TODO: define this, but it will be an
embedded document with keys like "name", "email", "gravatarEmail",
etc.


Group
-----

A group of users, used for access control when collaborating on
works.

Group properties:

`org`: The organisation that manages the group.  The organisation
admins can create and delete groups, and add and remove users from
them.

