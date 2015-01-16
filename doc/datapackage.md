
Data package format
===================

This specifies a file format for bulk-loading data about works from
existing collections into the catalog.

Eventually this should be a format that can be referred to by a MIME
type in a standard data package
(http://dataprotocols.org/data-packages/).


File format
-----------

A file contains either:

* JSON: defining a single work
* Line-delimited JSON: defining multiple works, each in one JSON record

Draft spec on line-delimited JSON:
https://github.com/ldjson/ldjson-spec/blob/master/specification_draft2.md

Discussion about its use in data packages:
https://github.com/dataprotocols/dataprotocols/issues/79

Note that the file suffix for line-delimited JSON is still being debated.


Work schema
-----------

In overview, each work is represented as a JSON object:

    {
        "annotations": [ general-work-annotations, ... ],
        "media": [
            { "annotations": [ media-specific-annotations, ... ] },
            ...
        ]
    }

Each annotation is a represented as a Media Annotation object, using
properties from the Ontoloty for Media Resources:
http://www.w3.org/2008/WebVideo/Annotations/drafts/API10/PR2/
http://www.w3.org/TR/mediaont-10/

The annotations either apply to the work as an abstract entity, or to
specific representations of the work ("media instances").

### Work properties

The most important work properties are:

* `title`: Title of the work. This property may be repeated to provide
  titles in multiple languages.

* `identifier`: Abstract identifier for a work, e.g. a canonical URL,
  a DOI, or some URN identifier.  A work can have multiple
  identifiers. The identifiers are unique to that work. The catalog
  import scripts will treat any works with the same identifier as the
  same work, and update the record instead of adding a new.

* `locator`: A URL to a web page where the work or information about
  it can be found.  The URL should not point to an image file itself.

* `copyright`: If the work is covered by copyright, provide the
  details in this annotation.

* `policy`: Provide the license information about the work if known.
  This would typically indicate public domain, CC0 or a CC license.

* `collection`: Collection from which the work originates.
  Elog.io browser extension currently supports the following collectionLink URLs:

    * `http://commons.wikimedia.org`
    * `http://commonsmachinery.se/`

Other properties from the Media Ontology can be used too. Please note that
for known properties, it's optional to specify a `value'. The known properties
are defined at https://github.com/commonsmachinery/catalog/blob/master/lib/knownProperties.js

Any property which is not a known property must specify a `value'.

### Media properties

The media instances of a work identify digital resources that
represent the work.  Typically these are digital images in various
sizes.  The properties that are relevant for these are the identifiers
and locators for the specific image, as well as technical information
such as frame size etc.

* `identifier`: Any file or perceptual hashes of the image should be
  included as a URN identifier.

* `locator`: URL where this particular file can be downloaded, if
  available.


### Example

    {
        "annotations": [
            {
                "propertyName": "title",
                "titleLabel": "Example title",
                "language": "en",
                "value": "Example title"
            },
            {
                "propertyName": "title",
                "titleLabel": "Exampeltitel",
                "language": "sv",
                "value": "Exampeltitel"
            },
            {
                "propertyName": "identifier",
                "identifierLink": "http://some.institute/some/collection/object",
                "value": "http://some.institute/some/collection/object"
            },
            {
                "propertyName": "locator",
                "locatorLink": "http://some.institute/some/collection/object",
                "value": "http://some.institute/some/collection/object"
            },
            {
                "propertyName": "policy",
                "statementLabel": "CC BY-SA 4.0",
                "statementLink": "http://creativecommons.org/licenses/by-sa/4.0/",
                "typeLabel": "license",
                "typeLink": "http://www.w3.org/1999/xhtml/vocab#license",
                "value": "CC BY-SA 4.0"
            },
            {
                "propertyName": "copyright",
                "holderLabel": "Jane Doe",
                "holderLink": "http://some.copyright.holder/",
                "value": "Jane Doe"
            },
            {
                "propertyName" : "collection",
                "collectionLink" : "http://some.institute/some/collection",
                "collectionLabel" : "Example Collection",
                "value" : "Example Collection"
            }
        ],
    
        "media": [
            {
                "annotations": [
                    {
                        "propertyName": "identifier",
                        "identifierLink": "urn:blockhash:34ac907fb1...",
                        "value": "urn:blockhash:34ac907fb1..."
                    },
                    {
                        "propertyName": "locator",
                        "locatorLink": "http://some.cdn.com/32423/23423.jpg",
                        "value": "http://some.cdn.com/32423/23423.jpg"
                    },
                    {
                        "propertyName": "frameSize",
                        "width": 1800,
                        "height": 2400,
                        "value": "1800,2400"
                    }
                ]
            },
            {
                "annotations": [
                    {
                        "propertyName": "identifier",
                        "identifierLink": "urn:blockhash:2310cda2190...",
                        "value": "urn:blockhash:2310cda2190..."
                    },
                    {
                        "propertyName": "locator",
                        "locatorLink": "http://some.cdn.com/thumbnails/32423/23423.jpg",
                        "value": "http://some.cdn.com/thumbnails/32423/23423.jpg"
                    },
                    {
                        "propertyName": "frameSize",
                        "width": 120,
                        "height": 120,
                        "value": "120,120"
                    }
                ]
            }
        ]
    }
