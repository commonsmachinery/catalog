
Event data model
================

Each object generates a set of core events, which then in turn can
generate additional "mirror" events on other affected objects.

These mirror events are primarily generated for the benefit of the
audit logs.


EventBatch
----------

Events are stored in batches.  Typically an object update generates a
set of events on that object, and all those events are stored together
in a batch.

### Properties

`_id`: Batch `ObjectID`.

`user`: `User._id` or `SiteAdmin._id` triggering the event, omitted
for system-generated events.

`date`: Event batch `Date`.

`type`: Affected object type, e.g. `core.Work`.

`object`: Affected object `ObjectId`.

`version`: Object version generating the events, if known.  This is
always set for events generated as part of an object update, but may
be omitted for events whose primary purpose is to improve the audit
log (e.g. mirrored events).

`events`: List of `Event` subdocuments, all affecting `object`.

### Index

`user, date` (sparse): Enable user audit log.

`object, date`: Enable object audit log.

`object, event` (sparse): Allow strict event processing to find all events in
correct order.


Event
-----

`event`: Event name (see below for lists).

`param`: Event-specific parameters as a map.


Core Events
===========

### Work events

Object events:

    core.work.created(work)
    core.work.deleted(work)
    core.work.changed(property, old_value, new_value)
    core.work.collabs.users.added(user_id)
    core.work.collabs.users.removed(user_id)
    core.work.collabs.group.added(group_id)
    core.work.collabs.group.removed(group_id)
    core.work.annotation.added(annotation)
    core.work.annotation.removed(annotation)
    core.work.annotation.changed(old_annotation, new_annotation)
    core.work.source.added(source)
    core.work.source.removed(source)
    core.work.media.added(media_id)
    core.work.media.removed(media_id)

Mirrored from other objects:

    core.work.forked(forked_work_id)
    core.work.collection.added(collection_id)
    core.work.collection.removed(collection_id)


### Media events

Object events:

    core.media.created(media)
    core.media.deleted(media)

Mirrored from other objects:

    core.media.replaced(new_media_id)
    core.media.work.added(work_id)
    core.media.work.removed(work_id)


### Collection events

Object events:

    core.collection.created(collection)
    core.collection.deleted(collection)
    core.collection.changed(property, old_value, new_value)
    core.collection.collabs.users.added(user_id)
    core.collection.collabs.users.removed(user_id)
    core.collection.collabs.group.added(group_id)
    core.collection.collabs.group.removed(group_id)
    core.collection.work.added(work_id)
    core.collection.work.removed(work_id)
    

### Organisation events

Object events:

    core.org.created(organisation)
    core.org.changed(property, old_value, new_value)
    core.org.owner.added(user_id)
    core.org.owner.removed(user_id)

Mirrored from other objects:

    core.org.group.created(group_id)
    core.org.group.deleted(group_id)
    core.org.work.created(work_id)
    core.org.work.deleted(work_id)
    core.org.collection.created(collection_id)
    core.org.collection.deleted(collection_id)
    

### User events

Object events:

    core.user.created(user)
    core.user.changed(property, old, new)
    core.user.changed.profile(property, old, new)

Mirrored from other objects:

    core.user.org.owner.added(org_id)
    core.user.org.owner.removed(org_id)
    core.user.group.member.added(org_id)
    core.user.group.member.removed(org_id)
    core.user.collection.created(collection_id)
    core.user.collection.deleted(collection_id)
    core.user.work.collaborator.added(work_id)
    core.user.work.collaborator.removed(work_id)
    core.user.collection.collaborator.added(work_id)
    core.user.collection.collaborator.removed(work_id)


### Group events

Object events:

    core.group.created(group)
    core.group.deleted(group)
    core.group.changed(property, old_value, new_value)
    core.group.member.added(user_id)
    core.group.member.removed(user_id)

Mirrored from other objects:

    core.group.work.collaborator.added(work_id)
    core.group.work.collaborator.removed(work_id)
    core.group.collection.collaborator.added(work_id)
    core.group.collection.collaborator.removed(work_id)


Security events
===============

TODO

