
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

`object_type`: an object type, e.g. `core.Work` or `core.User`.

`object_id`: The ID of the object.

`property_type`: The type of the property, typically
the value of `Annotation.propertyName` but could also be e.g. `alias`
or `profile.name`.

`property_id`: The ID of the property, if applicable
(e.g. `Annotation._id`), otherwise the same as `property_type`.

`score`: The score of annotation used to create Lookup record, if applicable.


### Index

`text` (text, sparse): Used for searches. 

`uri` (hash, sparse): Used for searches.

`object_id, property_id` (TODO: unique?): Compound index used when updating the data
model.
