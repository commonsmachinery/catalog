# -*- coding: utf-8 -*-
#
# catalog - backend for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir

import RDF
import pytest, os
import catalog.store
from catalog.store import MainStore, PublicStore

class TestConfig:
    BACKEND_STORE_TYPE = 'memory'

def serialize_model(store):
    output = store._model.to_string(name='ntriples').split('\n')
    output.sort()
    return '\n'.join(output)

@pytest.fixture
def store():
    return MainStore('memory', TestConfig)

@pytest.fixture
def public_store():
    return PublicStore('memory', TestConfig)

work1_uri = 'http://src/works/1'
work1_data = {
    'id': 1,
    'metadataGraph': {
        'http://src/works/1': {
            'http://purl.org/dc/terms/title': [ { 'value': 'First Work', 'type': 'literal' } ]
        }
    },
}

work2_uri = 'http://src/works/2'
work2_data = {
    'id': 2,
    'metadataGraph': {
        'http://src/works/2': {
            'http://purl.org/dc/terms/title': [ { 'value': 'Second Work', 'type': 'literal' } ]
        }
    },
}

work_update_data = {
    'state': 'published',
    'visibility': 'public',
}

source1_uri = 'http://src/works/1/sources/1'
source1_uri_user = 'http://src/users/test/sources/1'
source1_data = {
    'resource': 'http://src/works/2',
    'id': 1,
    'user_uri': 'http://src/users/test',
    'metadataGraph': {
        'http://src/works/1/sources/1': {
            'http://purl.org/dc/terms/provenance': [ { 'value': 'For testing only', 'type': 'literal' } ]
        }
    },
    'cachedExternalMetadataGraph': {
        'http://src/works/1/sources/1': {
            'http://purl.org/dc/terms/creator': [ { 'value': 'Cached Author', 'type': 'literal' } ]
        }
    },
}
source1_stock_data = {
    'resource': 'http://src/works/2',
    'id': 1,
    'user_uri': 'http://src/users/test',
    'metadataGraph': {
        'http://src/users/test/sources/1': {
            'http://purl.org/dc/terms/provenance': [ { 'value': 'For testing only', 'type': 'literal' } ]
        }
    },
    'cachedExternalMetadataGraph': {
        'http://src/users/test/sources/1': {
            'http://purl.org/dc/terms/creator': [ { 'value': 'Cached Author', 'type': 'literal' } ]
        }
    },
}

source_update_data = {
    'resource': 'http://src/works/3',
}

post1_uri = 'http://src/works/1/post/1'
post1_data = {
    'id': 1,
    'resource': 'http://example.com/post1',
    'metadataGraph': {
        'http://src/works/1/post/1': {
            'http://purl.org/dc/terms/type': [ { 'value': 'Embed', 'type': 'literal' } ]
        }
    },
}

post_update_data = {
    'resource': 'http://example.com/other-post',
    'metadataGraph': {
        'http://src/works/1/post/1': {
            'http://purl.org/dc/terms/type': [ { 'value': 'Unknown', 'type': 'literal' } ]
        }
    },
}

def load_testdata(filename):
    data = open('tests/testdata/' + filename).read()
    return data

def test_create_work_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_create_work_data(store):
    work = store.create_work(timestamp=1, user_uri='http://src/users/test', work_uri=work2_uri, work_data=work2_data)
    expected = {
        'resource': 'http://src/works/2',
        'creator': 'http://src/users/test',
        'created': 1,
        'visibility': 'private',
        'metadataGraph': {'http://src/works/2': {'http://purl.org/dc/terms/title': [{'type': 'literal', 'value': 'Second Work'}]}},
        'state': 'draft',
        'id': 2,
        'metadata': 'http://src/works/2/metadata',
        'type': 'Work'
    }
    assert work == expected

def test_delete_work(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    work = store.create_work(timestamp=1, user_uri='http://src/users/test', work_uri=work2_uri, work_data=work2_data)
    store.delete_work(user_uri='http://src/users/test', work_uri=work2_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_update_work_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.update_work(timestamp=2, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work_update_data)
    result = serialize_model(store)
    expected = load_testdata('work1_updated.nt')
    assert result == expected

def test_update_work_data(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    work = store.update_work(timestamp=2, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work_update_data)
    expected = {
        'updated': 2, 'resource': u'http://src/works/1',
        'created': u'0',
        'creator': u'http://src/users/test',
        'visibility': 'public',
        'metadataGraph': {u'http://src/works/1': {u'http://purl.org/dc/terms/title': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'First Work'}]}},
        'state': 'published',
        'updatedBy': 'http://src/users/test',
        'id': 1,
        'metadata': u'http://src/works/1/metadata',
        'type': 'Work',
    }
    assert work == expected

def test_get_work(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    work = store.get_work(user_uri='http://src/users/test', work_uri=work1_uri)
    expected = {
        'resource': u'http://src/works/1',
        'created': u'0',
        'creator': u'http://src/users/test',
        'visibility': u'private',
        'metadataGraph': {u'http://src/works/1': {u'http://purl.org/dc/terms/title': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'First Work'}]}},
        'state': u'draft',
        'id': 1,
        'metadata': u'http://src/works/1/metadata',
        'type': 'Work',
    }
    assert work == expected

def test_create_work_source_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    result = serialize_model(store)
    expected = load_testdata('source1.nt')
    assert result == expected

def test_create_work_source_data(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    source = store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    expected = {
        'added': 3, 'resource': 'http://src/works/2',
        'addedBy': 'http://src/users/test',
        'metadataGraph': {'http://src/works/1/sources/1': {'http://purl.org/dc/terms/provenance': [{'type': 'literal', 'value': 'For testing only'}]}},
        'cachedExternalMetadataGraph': {'http://src/works/1/sources/1': {'http://purl.org/dc/terms/creator': [{'type': 'literal', 'value': 'Cached Author'}]}},
        'cachedExternalMetadata': 'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1, 'metadata': 'http://src/works/1/sources/1/metadata',
        'type': 'Source',
    }
    assert source == expected

def test_delete_source(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    store.delete_source(user_uri='http://src/users/test', source_uri=source1_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_update_source_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    store.update_source(timestamp=4, user_uri='http://src/users/test', source_uri=source1_uri, source_data=source_update_data)
    result = serialize_model(store)
    expected = load_testdata('source1_updated.nt')
    assert result == expected

def test_update_source_data(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    source = store.update_source(timestamp=4, user_uri='http://src/users/test', source_uri=source1_uri, source_data=source_update_data)
    expected = {
        'updated': 4, 'added': u'3',
        'resource': 'http://src/works/3',
        'addedBy': u'http://src/users/test',
        'metadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/provenance': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'For testing only'}]}},
        'cachedExternalMetadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/creator': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Cached Author'}]}},
        'updatedBy': 'http://src/users/test',
        'cachedExternalMetadata': u'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': u'http://src/works/1/sources/1/metadata',
        'type': u'Source',
    }
    assert source == expected

def test_get_source(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    source = store.get_source(user_uri='http://src/users/test', source_uri=source1_uri)
    expected = {
        'added': u'3',
        'resource': u'http://src/works/2',
        'addedBy': u'http://src/users/test',
        'metadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/provenance': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'For testing only'}]}},
        'cachedExternalMetadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/creator': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Cached Author'}]}},
        'cachedExternalMetadata': u'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': u'http://src/works/1/sources/1/metadata',
        'type': u'Source',
    }
    assert source == expected

def test_create_stock_source_model(store):
    store.create_stock_source(timestamp=3, user_uri='http://src/users/test', source_uri=source1_uri_user, source_data=source1_stock_data)
    result = serialize_model(store)
    expected = load_testdata('source1_stock.nt')
    assert result == expected

def test_create_stock_source_data(store):
    source = store.create_stock_source(timestamp=3, user_uri='http://src/users/test', source_uri=source1_uri_user, source_data=source1_stock_data)
    expected = {
        'added': 3, 'resource': 'http://src/works/2',
        'addedBy': 'http://src/users/test',
        'metadataGraph': {'http://src/users/test/sources/1': {'http://purl.org/dc/terms/provenance': [{'type': 'literal',
        'value': 'For testing only'}]}}, 'cachedExternalMetadataGraph': {'http://src/users/test/sources/1': {'http://purl.org/dc/terms/creator': [{'type': 'literal', 'value': 'Cached Author'}]}},
        'cachedExternalMetadata': 'http://src/users/test/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': 'http://src/users/test/sources/1/metadata',
        'type': 'Source',
    }
    assert source == expected

def test_get_work_sources(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    result = store.get_work_sources(user_uri='http://src/users/test', work_uri=work1_uri)
    assert result[0]['id'] == 1

def test_get_stock_sources(store):
    source = store.create_stock_source(timestamp=3, user_uri='http://src/users/test', source_uri=source1_uri, source_data=source1_data)
    result = store.get_stock_sources(user_uri='http://src/users/test')
    assert result[0]['id'] == 1

def test_create_post_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    result = serialize_model(store)
    expected = load_testdata('post1.nt')
    assert result == expected

def test_create_post_data(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    post = store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    expected = {
        'resource': 'http://example.com/post1',
        'postedBy': 'http://src/users/test',
        'metadataGraph': {'http://src/works/1/post/1': {'http://purl.org/dc/terms/type': [{'type': 'literal', 'value': 'Embed'}]}},
        'cachedExternalMetadataGraph': {},
        'cachedExternalMetadata': 'http://src/works/1/post/1/cachedExternalMetadata',
        'metadata': 'http://src/works/1/post/1/metadata',
        'id': 1,
        'posted': 5,
        'type': 'Post',
    }
    assert post == expected

def test_delete_post(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    store.delete_post(user_uri='http://src/users/test', post_uri=post1_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_update_post_model(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    store.update_post(timestamp=6, user_uri='http://src/users/test', post_uri=post1_uri, post_data=post_update_data)
    result = serialize_model(store)
    expected = load_testdata('post1_updated.nt')
    assert result == expected

def test_update_post_data(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    post = store.update_post(timestamp=6, user_uri='http://src/users/test', post_uri=post1_uri, post_data=post_update_data)
    expected = {
        'updated': 6, 'updatedBy': 'http://src/users/test',
        'resource': u'http://example.com/other-post',
        'postedBy': u'http://src/users/test',
        'metadataGraph': {u'http://src/works/1/post/1': {u'http://purl.org/dc/terms/type': [{u'type': u'literal', u'value': u'Unknown'}]}},
        'cachedExternalMetadataGraph': {},
        'cachedExternalMetadata': u'http://src/works/1/post/1/cachedExternalMetadata',
        'metadata': u'http://src/works/1/post/1/metadata',
        'id': 1,
        'posted': u'5',
        'type': u'Post',
    }
    assert post == expected

def test_get_post(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    post = store.get_post(user_uri='http://src/users/test', post_uri=post1_uri)
    expected = {
        'resource': u'http://example.com/post1',
        'postedBy': u'http://src/users/test',
        'metadataGraph': {u'http://src/works/1/post/1': {u'http://purl.org/dc/terms/type': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Embed'}]}},
        'cachedExternalMetadataGraph': {},
        'cachedExternalMetadata': u'http://src/works/1/post/1/cachedExternalMetadata',
        'metadata': u'http://src/works/1/post/1/metadata',
        'id': 1,
        'posted': u'5',
        'type': u'Post',
    }
    assert post == expected

def test_get_posts(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(timestamp=5, user_uri='http://src/users/test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    result = store.get_posts(user_uri='http://src/users/test', work_uri=work1_uri)
    assert result[0]['id'] == 1

def test_get_complete_metadata(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    work = store.create_work(timestamp=1, user_uri='http://src/users/test', work_uri=work2_uri, work_data=work2_data)
    store.create_work_source(timestamp=3, user_uri='http://src/users/test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    complete = store.get_complete_metadata(user_uri='http://src/users/test', work_uri=work1_uri, format='ntriples')
    result = "\n".join(sorted(complete.split("\n")))
    expected = load_testdata("complete_metadata.nt")
    assert result == expected

def test_query_simple(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    work = store.create_work(timestamp=1, user_uri='http://src/users/test', work_uri=work2_uri, work_data=work2_data)
    result = store.query_works_simple(user_uri='http://src/users/test', offset=0, limit=0, query={
        "http://purl.org/dc/terms/title": "First Work"
    })
    assert len(result) == 1 and result[0]['id'] == 1

def test_query_sparql(public_store):
    public_work = public_store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    query = "SELECT ?s ?o WHERE { ?s <http://purl.org/dc/terms/title> ?o}"
    expected = """<?xml version="1.0" encoding="utf-8"?>
<sparql xmlns="http://www.w3.org/2005/sparql-results#">
  <head>
    <variable name="s"/>
    <variable name="o"/>
  </head>
  <results>
    <result>
      <binding name="s"><uri>http://src/works/1</uri></binding>
      <binding name="o"><literal>First Work</literal></binding>
    </result>
  </results>
</sparql>
"""
    result = public_store.query_sparql(query, results_format="xml")
    assert expected == result

def test_read_permissions(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    with pytest.raises(catalog.store.EntryAccessError):
        store.get_work(user_uri='http://src/users/test2', work_uri=work1_uri)

    store.update_work(timestamp=2, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work_update_data)
    store.get_work(user_uri='http://src/users/test2', work_uri=work1_uri)

def test_modify_permissions(store):
    work = store.create_work(timestamp=0, user_uri='http://src/users/test', work_uri=work1_uri, work_data=work1_data)
    with pytest.raises(catalog.store.EntryAccessError):
        store.update_work(timestamp=2, user_uri='http://src/users/test2', work_uri=work1_uri, work_data=work_update_data)
