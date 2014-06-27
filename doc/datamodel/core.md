
Core datamodel
==============

The core datamodel handles all core CRUD operations, and is the source
for aggregations into query databases.

The objects are stored as documents in a MongoDB database, using
ObjectIDs to identify objects both in the store and in URLs.

See [core.png](core.png) (original UMLet file is `core.uxf`) for an
overview, and object properties not yet listed in this document.


Key concepts
------------

- The W3C Ontology for Media Resources is used as a core metadata
  model (see more under Annotation below).

- All ID generation is handled by the MongoDB ObjectIDs.

- The top-level objects can be updated atomically: if there are
  simultaneous modifications of a single document only one will
  succeed, and the others will fail and can be retried after taking
  the new data into account.

- ObjectIDs are translated into full REST API endpoint URLs by the
  frontend when sending objects to clients as JSON.

- For now this data model contains indices to support the website, but as
  the view module is extended several of them may be possible to drop.
  

Main Objects
============

Entry
-----

Most main objects derive from Entry, which provides some common base
properties and support for atomic updates.

### Properties

`_id`: Unique ID, assigned via an ObjectID

`__v`: Mongoose object version ID.

`added_by`: The `User` who added the entry.

`added_at`: The `Date` when the entry was added.

`updated_by`: The `User` who last modified the entry.

`updated_at`: The `Date` when the entry was last modified.



Work
----

Work is the central concept in the catalog.  It's focusing on works as
an abstract concept - actual instances of it are represented as Media
objects.

All information about the work is embedded into the MongoDB document,
(except for the Media instances which are referenced to from a list).
The rationale is that the work information is a whole and should be
updated as such.

### Properties

`alias` (optional): Short name that can be used in URLs, omitted if not
set.

`owner`: `Owner` subdocument indicating the User or Organisation owning
the Work object (which doesn't imply any kind of copyright ownership).
The user owning the object or the admins of the organisation are
always allowed to edit a work.

`description` (optional): Catalog-internal notes about this work,
mainly for the user's own purposes.  Not considered work metadata.

`forked_from` (optional): If this work was created by forking another
work, this is the ID of the parent.  Omitted if not forked.

`public`: `true` if this work is publically visible.

`collabs`: `Collaborators` subdocument listing IDs for `Group` and
`User` who can access this `Work` and its linked `Media`.

`annotations`: The work metadata.  This is an unordered list of
embedded `WorkAnnotation` documents.

`sources`: List of sources as embedded documents.

`media`: List of object ID references to Media instances representing
this work.

### Index

`owner.user, alias` (sparse, unique): For prettier URLs.

`owner.org, alias` (sparse, unique): For prettier URLs.

`owner.user` (sparse): List my works.

`owner.org` (sparse): List our works.

`collabs.users` (multikey): List user's collaborations.

`collabs.groups` (multikey): List group's collaborations.

`sources.source_work` (multikey): Show work relationships.

`forked_from` (sparse): Show work relationships.

`media` (multikey): Show works a Media is used in.

### Access

The following users have full access to read, update and delete the
`Work`:

- `Work.owner.user`, if set
- `Organisation.owners` for `Work.owner.org`, if set
- Any `User` in `Work.collaborators`

For `Group.members` in `Work.collabs.groups`, `Group.access` controls
access.  Each higher level includes the access of the lower level:

- `read`: see the information about a non-public `Work`
- `write`: change any of the information in the `Work` except
  `Work.collabs` and `Work.public`
- `admin`: change `Work.collabs` and `Work.public`


Media
-----

A representation of a work is referred to as a Media instance in this
data model.  It can represent a particular file, a web page where the
work is available, or the combination.

Media objects are readonly, once created, and thus represent a
snapshot at a given time of the instance.  A given Media instance can
be linked to any number of Works (via the `Work.media` list).  A Media
instance that is not linked to any work can be garbage collected to
reduce the size of the database, if desired.

While important as the raw data in the catalog, in most cases the
Media instances will rarely be used much, with all focus on the
refined, "curated", information in the corresponding Work objects.

### Properties

`_id`: Unique ID, assigned via an ObjectID

`added_by`: The `User` who added the `Media`.

`added_at`: The `Date` when the `Media` was added.

`replaces` (optional): If the data for a `Media` instance is
refreshed, a new instance is created and linked through this property
to the old version.  Omitted if not a replacement.

`annotations`: The metadata about this Media instance, typically
derived from the file/page metadata.  A list of `MediaAnnotation`
subdocuments.

`metadata`: Raw metadata captured about this object, stored as an
embedded document. Maps from different types of metadata to the
information in a suitable format (e.g. RDF/JSON for `rdf` and an XML
string for `xmp`).

### Index

`replaces` (sparse): Show media relationships.

### Access

A user with read access to a `Work` (which implies all users for
public works) also have read access to the linked `Media` instances.
To handle this, all accesses go via a `Work`.


Collection
----------

A collection of Work objects.  Works do not have to be part of any
collection, but it helps organising them.

### Properties

`owner`: `Owner` subdocument indicating the User or Organisation
that the collection belongs to.

`name`: Name identifying the collection to users.

`alias` (optional): Short name that can be used in URLs, omitted if not
set.

`description` (optional): More detailed description of the purpose and
contents of the collection.

`works`: List of `Work` objects in the collection, linked by ID.

`public`: `true` if this collection is publically visible.

`collabs`: `Collaborators` subdocument listing `User` and `Group` with
access to the collection.

### Index

`owner.user, alias` (sparse, unique): For prettier URLs.

`owner.org, alias` (sparse, unique): For prettier URLs.

`owner.user` (sparse): List my collections.

`owner.org` (sparse): List our collections.

`collabs.users` (multikey): List my collaborations.

`collabs.groups` (multikey): List our collaborations.

`works` (multikey): List the collections a work is included in.

### Access

The following users have full access to list, modify and delete the
`Collection`:

- `Collection.owner.user`, if set
- `Organisation.owners`, if `Collection.owner.org` is set
- Any `User` in `Collection.collabs.users`

For `Group.members` in `Collection.collabs.groups`, `Group.access`
controls access.  Each higher level includes the access of the lower
level:

- `read`: see a non-public `Collection`
- `write`: change any of the information in the `Collection` except
  `Collection.collabs` and `Collection.public`
- `admin`: change `Collection.collabs` and `Collection.public`

Note that even though a user may be allowed to see a collection, they
may not be allowed to see all `Work` collected in it.


Organisation
------------

Similar to a Github organisation, these objects are used to organise
groups of people who collaborate on works or collections.

### Properties

`alias`: Short name that can be used in URLs.

`owners`: List of `User` who have the right to administer all aspects
of the organisation.

### Index

`alias` (unique): For prettier URLs.

`owners` (multikey): Enable user summary listing organisation ownership.

### Access

Anyone can see the information about an `Organisation`, except for
`Organisation.profile.gravatar_email` which is only visible to the
user.


User
----

Represents a user of the catalog.  Like Github, users are their own
identities and do not have to be associated with an Organisation.

Links to the user from the surrounding world are handled by the auth
module.

### Properties

`alias` (optional): Short name that can be used in URLs.

`profile`: Public profile.  TODO: define this, but it will be an
embedded document with keys like "name", "email", "gravatarEmail",
etc.

### Index

`alias` (unique, sparse): For prettier URLs.

### Access

Anyone can see the information about a `User`, except for
`User.profile.gravatar_email` which is only visible to the user.


Group
-----

A group of users, used for access control when collaborating on
works.

### Properties

`org`: The organisation that manages the group.

`name`: Name of the group.

`access`: One of `read`, `write` or `admin`.  Controls access to
`Work` and `Collection` objects for the group members.

`members`: List of `User` IDs for the members of the group.

### Index

`org`: Enable organisation summary listing all groups.

`org, name` (unique): Enforce unique group names.

`members` (multikey): Enable user summary listing all memberships.

### Access

`Organisation.owners` have full access to see, create, change and
delete groups.

`Group.members` can see the group and who the other members are.


Subobjects
==========

Owner
-----

Denotes the owner (of the record, not necessarily of any work
copyright) of a `Work` or `Collection`.  Exactly one of `user` or
`org` must be set.


Collaborators
-------------

Lists `User` and `Group` who can collaborate on a `Work` or
`Collection`.


MediaAnnotation
----------

The W3C Ontology for Media Resources (OMR) provide a core set of metadata
properties, or _annotations_, with normalisation rules from a number
of metadata standards: http://www.w3.org/TR/mediaont-10/

This gives us a nice framework for processing metadata into a common
model that we can more easily manipulate than generic RDF.  The price
is losing the depth of information that RDF allows, but in practice we
will not be able to make that understandable for users who are not
semantic web academics.

We can add additional properties to this core set when we need it.

Some key annotation types will be:

- `identifier`: anything identifying a work, typically structured as
  URIs.  These may be a web address to e.g. a flickr photo page or a
  hash in URN format. A work or media might have several different ID
  annotations, implying different ways of identifying the abstract
  work.

- `locator`: where the work or media instance can be found, typically
  a URL.  Here too there may be multiple URLs.

- `title`: name of the work.

- `policy`: CC license information.

### Properties

`_id`: ObjectID for the annotation.

`property`: The property itself, as an embedded
[MediaAnnotation](http://www.w3.org/2008/WebVideo/Annotations/drafts/API10/PR2/#maobject-interface)
object.  Only the properties with a value are stored (e.g. excluding
`language` when irrelevant or not known), and `statusCode` is always
excluded.


WorkAnnotation
--------------

This is a subclass to `MediaAnnotation`, extending it with additional
properties.

##3 Properties

`updated_by`: May be omitted if the latest update was by the
`Work.added_by` `User`.

`updated_at`: The date and time when this record was updated.  May be
omitted if the same as `Work.added_at`.

`score`: A metadata reliability score from 0-100.  0 means that the
annotation should be hidden from the users, and is an alternative to
deleting data outright. How this score is set is not in the scope of
this document.


Source
------

A Source just links a "remix" work to the source works that it was
derived from.

**TODO:** There probably should be some scope to capture how the works
are related in this source object - the provenance - but that can be
decided later.

### Properties

`_id`: ObjectID for the `Source`, to make it easier to refer to it in
the REST API.

`source_work`: The ID of the source `Work`.

`added_by`: The `User` who added the link, may be omitted if the same
as `Work.added_by`.

`added_at`: The `Date` when the link was added, may be omitted if the
same as `Work.added_at`.


Profile
-------

Public information about a `User` or an `Organisaton`.

### Properties

`name` (optional): Full name.

`email` (optional): Publically visible email address.

`location` (optional): Where this person or organisation is located.

`website` (optional): Primary website.

`gravatar_email` (optional): Email for gravatar icon, if any.

`gravatar_hash`: Hash for gravatar icon.  Always set, if
`gravatar_email` is missing this is instead based on the ObjectID.


