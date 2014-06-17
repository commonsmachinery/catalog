
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

`version`: Object version generating the events.

`events`: List of `Event` subdocuments, all affecting `object_id`.

### Index

`user, date` (sparse): Enable user audit log.

`object_id, date`: Enable object audit log.


Event
-----

`type`: Event name (see below for lists).

`param`: Event-specific parameters as a map.


Core Events
===========

### Work events

Object events:

    work.created(work)
    work.deleted(work)
    work.PROPERTY.changed(old_value, new_value)
    work.collaborator.added(collaborator_id)
    work.collaborator.removed(collaborator_id)
    work.annotation.added(annotation)
    work.annotation.removed(annotation)
    work.annotation.changed(old_annotation, new_annotation)
    work.source.added(source)
    work.source.removed(source)
    work.media.added(media_id)
    work.media.removed(media_id)
    work.collaborators.replaced(old_collaborator_ids, new_collaborator_ids)
    work.annotations.replaced(old_annotations, new_annotations)
    work.medias.replaced(old_media_ids, new_media_ids)

Mirrored from other objects:

    work.forked(forked_work_id)
    work.collection.added(collection_id)
    work.collection.removed(collection_id)



### Media events

Object events:

    media.created(media)
    media.deleted(media)

Mirrored from other objects:

    media.replaced(new_media_id)
    media.work.added(work_id)
    media.work.removed(work_id)


### Collection events

Object events:

    collection.created(collection)
    collection.deleted(collection)
    collection.PROPERTY.changed(old_value, new_value)
    collection.work.added(work_id)
    collection.work.removed(work_id)
    collection.collaborator.added(collaborator_id)
    collection.collaborator.removed(collaborator_id)
    collection.collaborators.replaced(old_collaborator_ids, new_collaborator_ids)
    collection.works.replaced(old_work_ids, new_work_ids)
    

### Organisation events

Object events:

    org.created(organisation)
    org.PROPERTY.changed(old_value, new_value)
    org.profile.PROPERTY.changed(old_value, new_value)
    org.owner.added(user_id)
    org.owner.removed(user_id)
    org.owners.replaced(old_user_id, new_user_ids)

Mirrored from other objects:

    org.group.created(group_id)
    org.group.deleted(group_id)
    org.work.created(work_id)
    org.work.deleted(work_id)
    org.collection.created(collection_id)
    org.collection.deleted(collection_id)
    

### User events

Object events:

    user.created(user)
    user.PROPERTY.changed(old, new)
    user.profile.PROPERTY.changed(old, new)

Mirrored from other objects:

    user.org.owner.added(org_id)
    user.org.owner.removed(org_id)
    user.group.member.added(org_id)
    user.group.member.removed(org_id)
    user.work.created(work_id)
    user.work.deleted(work_id)
    user.collection.created(collection_id)
    user.collection.deleted(collection_id)
    user.work.collaborator.added(work_id)
    user.work.collaborator.removed(work_id)
    user.collection.collaborator.added(work_id)
    user.collection.collaborator.removed(work_id)


### Group events

Object events:

    group.created(group)
    group.deleted(group)
    group.PROPERTY.changed(old_value, new_value)
    group.member.added(user_id)
    group.member.removed(user_id)
    group.members.replaced(old_user_id, new_user_ids)

Mirrored from other objects:

    group.work.collaborator.added(work_id)
    group.work.collaborator.removed(work_id)
    group.collection.collaborator.added(work_id)
    group.collection.collaborator.removed(work_id)


Security events
===============

TODO

