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

os.environ['CATALOG_BACKEND_STORE_TYPE'] = 'memory'

def serialize_model(store):
    output = store._model.to_string(name='ntriples').split('\n')
    output.sort()
    return '\n'.join(output)

@pytest.fixture
def store():
    return MainStore('memory')

@pytest.fixture
def public_store():
    return PublicStore('memory')

work1_uri = 'http://src/works/1'
work1_data = {
    'id': 1,
    'timestamp': 0,
    'metadataGraph': {
        'about:resource': {
            'http://purl.org/dc/terms/title': [ { 'value': 'First Work',
        'type': 'literal' } ]
        }
    },
}

work2_uri = 'http://src/works/2'
work2_data = {
    'id': 2,
    'timestamp': 1,
    'metadataGraph': {
        'about:resource': {
            'http://purl.org/dc/terms/title': [ { 'value': 'Second Work',
        'type': 'literal' } ]
        }
    },
}

work_update_data = {
    'state': 'published',
    'visibility': 'public',
    'timestamp': 2,
}

source1_uri = 'http://src/works/1/sources/1'
source1_data = {
    'resource': 'http://src/works/2',
    'id': 1,
    'timestamp': 3,
    'user': 'test',
    'metadataGraph': {
        'about:resource': {
            'http://purl.org/dc/terms/provenance': [ { 'value': 'For testing only', 'type': 'literal' } ]
        }
    },
    'cachedExternalMetadataGraph': {
        'about:resource': {
            'http://purl.org/dc/terms/creator': [ { 'value': 'Cached Author', 'type': 'literal' } ]
        }
    },
}

source_update_data = {
    'resource': 'http://src/works/3',
    'timestamp': 4,
}

post1_uri = 'http://src/works/1/post/1'
post1_data = {
    'id': 1,
    'timestamp': 5,
    'resource': 'http://example.com/post1',
    'metadataGraph': {
        'about:resource': {
            'http://purl.org/dc/terms/type': [ { 'value': 'Embed', 'type': 'literal' } ]
        }
    },
}

def load_testdata(filename):
    data = open('tests/testdata/' + filename).read()
    return data

def test_create_work_model(store):
    work = store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_create_work_data(store):
    work = store.create_work(user='test', work_uri=work2_uri, work_data=work2_data)
    expected = {'resource': 'http://src/works/2',
        'creator': 'test',
        'created': 1,
        'visibility': 'private',
        'metadataGraph': {'about:resource': {'http://purl.org/dc/terms/title': [{'type': 'literal', 'value': 'Second Work'}]}},
        'state': 'draft',
        'id': 2,
        'metadata': 'http://src/works/2/metadata'}
    assert work == expected

def test_delete_work(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work(user='test', work_uri=work2_uri, work_data=work2_data)
    store.delete_work(user='test', work_uri=work2_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_update_work_model(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.update_work(user='test', work_uri=work1_uri, work_data=work_update_data)
    result = serialize_model(store)
    expected = load_testdata('work1_updated.nt')
    assert result == expected

def test_update_work_data(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    work = store.update_work(user='test', work_uri=work1_uri, work_data=work_update_data)
    expected = {'updated': 2, 'resource': u'http://src/works/1',
        'created': u'0',
        'creator': u'test',
        'visibility': 'public',
        'metadataGraph': {u'http://src/works/1': {u'http://purl.org/dc/terms/title': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'First Work'}]}},
        'state': 'published',
        'updatedBy': 'test',
        'id': 1,
        'metadata': u'http://src/works/1/metadata'}
    assert work == expected

def test_get_work(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    work = store.get_work(user='test', work_uri=work1_uri)
    expected = {'resource': u'http://src/works/1',
        'created': u'0',
        'creator': u'test',
        'visibility': u'private',
        'metadataGraph': {u'http://src/works/1': {u'http://purl.org/dc/terms/title': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'First Work'}]}},
        'state': u'draft',
        'id': 1,
        'metadata': u'http://src/works/1/metadata'}
    assert work == expected

def test_create_work_source_model(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    result = serialize_model(store)
    expected = load_testdata('source1.nt')
    assert result == expected

def test_create_work_source_data(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    source = store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    expected = {'added': 3, 'resource': 'http://src/works/2',
        'addedBy': 'test',
        'metadataGraph': {'about:resource': {'http://purl.org/dc/terms/provenance': [{'type': 'literal', 'value': 'For testing only'}]}},
        'cachedExternalMetadataGraph': {'about:resource': {'http://purl.org/dc/terms/creator': [{'type': 'literal', 'value': 'Cached Author'}]}},
        'cachedExternalMetadata': 'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1, 'metadata': 'http://src/works/1/sources/1/metadata'}
    assert source == expected

def test_delete_source(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    store.delete_source(user='test', source_uri=source1_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_update_source_model(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    store.update_source(user='test', source_uri=source1_uri, source_data=source_update_data)
    result = serialize_model(store)
    expected = load_testdata('source1_updated.nt')
    assert result == expected

def test_update_source_data(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    source = store.update_source(user='test', source_uri=source1_uri, source_data=source_update_data)
    expected = {'updated': 4, 'added': u'3',
        'resource': 'http://src/works/3',
        'addedBy': u'test',
        'metadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/provenance': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'For testing only'}]}},
        'cachedExternalMetadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/creator': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Cached Author'}]}},
        'updatedBy': 'test',
        'cachedExternalMetadata': u'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': u'http://src/works/1/sources/1/metadata'}
    assert source == expected

def test_get_source(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    source = store.get_source(user='test', source_uri=source1_uri)
    expected = {'added': u'3',
        'resource': u'http://src/works/2',
        'addedBy': u'test',
        'metadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/provenance': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'For testing only'}]}},
        'cachedExternalMetadataGraph': {u'http://src/works/1/sources/1': {u'http://purl.org/dc/terms/creator': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Cached Author'}]}},
        'cachedExternalMetadata': u'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': u'http://src/works/1/sources/1/metadata'}
    assert source == expected

def test_create_stock_source_model(store):
    store.create_stock_source(user='test', source_uri=source1_uri, source_data=source1_data)
    result = serialize_model(store)
    expected = load_testdata('source1_stock.nt')
    assert result == expected

def test_create_stock_source_data(store):
    source = store.create_stock_source(user='test', source_uri=source1_uri, source_data=source1_data)
    expected = {'added': 3, 'resource': 'http://src/works/2',
        'addedBy': 'test',
        'metadataGraph': {'about:resource': {'http://purl.org/dc/terms/provenance': [{'type': 'literal',
        'value': 'For testing only'}]}}, 'cachedExternalMetadataGraph': {'about:resource': {'http://purl.org/dc/terms/creator': [{'type': 'literal', 'value': 'Cached Author'}]}},
        'cachedExternalMetadata': 'http://src/works/1/sources/1/cachedExternalMetadata',
        'id': 1,
        'metadata': 'http://src/works/1/sources/1/metadata'}
    assert source == expected

def test_get_work_sources(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    result = store.get_work_sources(user='test', work_uri=work1_uri)
    assert result[0]['id'] == 1

def test_get_stock_sources(store):
    source = store.create_stock_source(user='test', source_uri=source1_uri, source_data=source1_data)
    result = store.get_stock_sources(user='test')
    assert result[0]['id'] == 1

def test_create_post_model(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(user='test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    result = serialize_model(store)
    expected = load_testdata('post1.nt')
    assert result == expected

def test_create_post_data(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    post = store.create_post(user='test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    expected = {'resource': 'http://example.com/post1',
        'postedBy': 'test',
        'metadataGraph': {'about:resource': {'http://purl.org/dc/terms/type': [{'type': 'literal', 'value': 'Embed'}]}},
        'cachedExternalMetadataGraph': {},
        'cachedExternalMetadata': 'http://src/works/1/post/1/cachedExternalMetadata',
        'metadata': 'http://src/works/1/post/1/metadata',
        'id': 1,
        'posted': 5}
    assert post == expected

def test_delete_post(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(user='test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    store.delete_post(user='test', post_uri=post1_uri)
    result = serialize_model(store)
    expected = load_testdata('work1.nt')
    assert result == expected

def test_get_post(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(user='test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    post = store.get_post(user='test', post_uri=post1_uri)
    expected = {'resource': u'http://example.com/post1',
        'postedBy': u'test',
        'metadataGraph': {u'http://src/works/1/post/1': {u'http://purl.org/dc/terms/type': [{u'datatype': u'http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral', u'type': u'literal', u'value': u'Embed'}]}},
        'cachedExternalMetadataGraph': {},
        'cachedExternalMetadata': u'http://src/works/1/post/1/cachedExternalMetadata',
        'metadata': u'http://src/works/1/post/1/metadata',
        'id': 1,
        'posted': u'5'}
    assert post == expected

def test_get_posts(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_post(user='test', work_uri=work1_uri, post_uri=post1_uri, post_data=post1_data)
    result = store.get_posts(user='test', work_uri=work1_uri)
    assert result[0]['id'] == 1

def test_get_complete_metadata(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work(user='test', work_uri=work2_uri, work_data=work2_data)
    store.create_work_source(user='test', work_uri=work1_uri, source_uri=source1_uri, source_data=source1_data)
    complete = store.get_complete_metadata(user='test', work_uri=work1_uri, format='ntriples')
    result = "\n".join(sorted(complete.split("\n")))
    expected = load_testdata("complete_metadata.nt")
    assert result == expected

def test_query_simple(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    store.create_work(user='test', work_uri=work2_uri, work_data=work2_data)
    result = store.query_works_simple(user='test', **{
        "http://purl.org/dc/terms/title": "First Work"
    })
    assert len(result) == 1 and result[0]['id'] == 1

def test_query_sparql(public_store):
    public_store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
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
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    with pytest.raises(catalog.store.EntryAccessError):
        store.get_work(user='test2', work_uri=work1_uri)

    store.update_work(user='test', work_uri=work1_uri, work_data=work_update_data)
    store.get_work(user='test2', work_uri=work1_uri)

def test_modify_permissions(store):
    store.create_work(user='test', work_uri=work1_uri, work_data=work1_data)
    with pytest.raises(catalog.store.EntryAccessError):
        store.update_work(user='test2', work_uri=work1_uri, work_data=work_update_data)
