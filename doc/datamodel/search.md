
Search datamodel
================

The search module is responsible for looking up works and media based
on URIs or free-text searches.

It is populated and updated by a job triggered by core update events.

Lookup
------

Since properties may have both a URI and a text value, there is a
single Lookup object.

`text`: The text value, property is omitted if there is none.

`uri`: The URI, property is omitted if there is none.

`object_type`: a core object type, e.g. `Work` or `User`.

`object_id`: The ID of the object.

`property_type`: The type of the property for `text`.

`property_id`: The ID of the property, if applicable (e.g. `Annotation._id`).

`public`: If this object is publically visible.

`visible_to`: List of `User._id` or `Group._id` that can see the
object, if not public.


### Index

`text` (text, sparse): Used for searches. 

`uri` (hash, sparse): Used for searches.

`object_id, property_id`: Compound index used when updating the data
model.
