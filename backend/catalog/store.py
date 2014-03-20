# -*- coding: utf-8 -*-
#
# backend - query/update graphs for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

import time
import re
import RDF
import os
from urlparse import urlsplit, urlunsplit

import logging
_log = logging.getLogger("catalog")

class ParamError(Exception): pass

class EntryAccessError(Exception):
    pass

class EntryNotFoundError(Exception):
    def __init__(self, context):
        super(Exception, self).__init__(self, 'Entry not found: {0}'.format(context))

valid_work_visibility = [ 'private', 'group', 'public' ]
valid_work_state = [ 'draft', 'published' ]

NS_CATALOG = "http://catalog.commonsmachinery.se/ns#"
NS_REM3 = "http://scam.sf.net/schema#"
NS_XSD = "http://www.w3.org/2001/XMLSchema#"

CREATE_WORK_SUBJECT = "about:resource"

# convert Entry schemas to dicts with URI keys for serializing to JSON
def schema2json(s):
    json_schema = {}
    for key, value in s.iteritems():
        type, uri = value
        json_schema[uri] = type, key
    return json_schema

class Entry(object):
    schema = {
        'updated':      ('string',  NS_CATALOG  + "updated"     ),
        'updatedBy':    ('string',  NS_CATALOG  + "updatedBy"   ),
    }

    def __init__(self, dict):
        self._dict = dict

    def __getitem__(self, name):
        if self._dict.has_key(name):
            return self._dict[name]
        else:
            raise AttributeError("Unknown entry property: %s" % name)

    def get_data(self):
        return self._dict

    @classmethod
    def from_json(cls, dict):
        return cls(dict)

    # get graph as RDF/JSON dict from under a specific context in Redland model
    @classmethod
    def _get_graph(cls, model, context):
        metadata_graph = {}

        for statement in model.as_stream(context=context):
            subject_uri = unicode(statement.subject.uri)
            predicate_uri = unicode(statement.predicate.uri)

            if not metadata_graph.has_key(subject_uri):
                metadata_graph[subject_uri] = {}

            if not metadata_graph[subject_uri].has_key(predicate_uri):
                metadata_graph[subject_uri][predicate_uri] = []

            object = {}

            if statement.object.is_literal():
                # TODO: support lang
                object[u"type"] = u"literal"
                object[u"datatype"] = u"http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral"
                object[u"value"] = statement.object.literal[0]
            elif statement.object.is_resource():
                object[u"type"] = u"uri"
                object[u"value"] = unicode(statement.object.uri)
            elif statement.object.is_blank():
                object[u"type"] = u"bnode"
                object[u"value"] = unicode(statement.object.blank)

            metadata_graph[subject_uri][predicate_uri].append(object)

        return metadata_graph

    @classmethod
    def from_model(cls, model, context):
        """
        Retrieve entry from the store
        """
        data = {}
        context = RDF.Node(uri_string=context)

        if context is None:
            raise ValueError("null context")

        for statement in model.as_stream(context=context):
            property_uri = unicode(statement.predicate.uri)
            if property_uri not in cls.json_schema:
                raise RuntimeError("Unknown work property %s" % property_uri)

            property_type, property_name = cls.json_schema[property_uri]
            if statement.object.is_literal():
                property_value = statement.object.literal[0]
                if property_type == "number":
                    property_value = int(property_value)
                elif property_type == "string":
                    property_value = unicode(property_value)
                else:
                    raise RuntimeError("Unknown property type %s" % property_type)

            elif statement.object.is_resource():
                if property_type == "graph":
                    graph_property_name = property_name + "Graph"
                    graph_property_value = cls._get_graph(model, statement.object)
                    data[graph_property_name] = graph_property_value
                    property_value = unicode(statement.object.uri)
                elif property_type == "uri_list":
                    if data.has_key(property_name):
                        property_value = data[property_name]
                        property_value.append(str(statement.object.uri))
                    else:
                        property_value = [str(statement.object.uri)]
                elif property_type == "resource":
                    property_value = unicode(statement.object.uri)
            else:
                raise RuntimeError('cannot handle blank nodes in work properties: %s' % statement)

            data[property_name] = property_value

        if len(data) == 0:
            raise EntryNotFoundError(context)

        return cls(data)

    def to_model(self, model):
        context = RDF.Node(uri_string=self._dict['resource'])
        statements = []

        for key, value in self.__class__.schema.iteritems():
            property_name = key
            property_type, property_uri = value

            # make sure graph fields exist, even if the graph is empty
            if property_type == "graph" and not self._dict.has_key(property_name):
                self._dict[key] = self._dict['resource'] + "/" + property_name

            if property_type == "graph" and not self._dict.has_key(property_name + "Graph"):
                self._dict[property_name + "Graph"] = {}

            if not self._dict.has_key(property_name):
                continue

            if property_type == "number" or property_type == "string":
                statement = (context, # ex work_subject
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(literal=str(self._dict[key])),
                             context)
                statements.append(statement)
            elif property_type == "resource": # and self._dict.get(key, False):
                statement = (context, # ex work_subject
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=str(self._dict[key])),
                             context)
                statements.append(statement)
            elif property_type == "uri_list":
                # TODO: support source/post objects?
                for uri in self._dict[key]:
                    statement = (context, # ex work_subject
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=uri),
                             context)
                    statements.append(statement)
            elif property_type == "graph":
                statement = (context, # ex work_subject
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=str(self._dict[key])),
                             context)
                statements.append(statement)

                graph_context = RDF.Node(uri_string=str(self._dict[key]))
                graph = self._dict[property_name + "Graph"]

                for subject in graph.keys():
                    if subject == CREATE_WORK_SUBJECT:
                        # alias for the new subject of the work
                        subject_node = context # ex work_subject
                    else:
                        subject_node = RDF.Node(uri_string=str(subject))

                    for predicate in graph[subject].keys():
                        predicate_node = RDF.Node(uri_string=str(predicate))

                        for object in graph[subject][predicate]:
                            value = object["value"]
                            type = object["type"]
                            #datatype = object["datatype"]
                            # TODO: support lang

                            if type == "literal":
                                object_node = RDF.Node(literal=value)
                            elif type == "uri":
                                object_node = RDF.Node(uri_string=value)
                            elif type == "bnode":
                                object_node = RDF.Node(blank=value)

                            statement = (subject_node, predicate_node, object_node, graph_context)
                            statements.append(statement)
            else:
                raise RuntimeError("Unknown property type %s" % property_type)

        for s, p, o, c in statements:
            statement = RDF.Statement(s, p, o)
            if (statement, c) not in model:
                model.append(statement, context=c)

    def get_subgraphs(self):
        subgraphs = []
        for key, value in self.__class__.schema.iteritems():
            property_type, property_uri = value

            if property_type == "graph" and self._dict.has_key(key):
                subgraphs.append(self._dict[key])

        return subgraphs
Entry.json_schema = schema2json(Entry.schema)


class Work(Entry):
    schema = {
        'id':           ('number',    NS_CATALOG  + "id"          ),
        'resource':     ('resource',  NS_REM3     + "resource"    ),
        'metadata':     ('graph',     NS_REM3     + "metadata"    ),
        'created':      ('string',    NS_CATALOG  + "created"     ),
        'creator':      ('string',    NS_CATALOG  + "creator"     ),
        'updated':      ('string',    NS_CATALOG  + "updated"     ),
        'updatedBy':    ('string',    NS_CATALOG  + "updatedBy"   ),
        'visibility':   ('string',    NS_CATALOG  + "visibility"  ),
        'state':        ('string',    NS_CATALOG  + "state"       ),
        'post':         ('uri_list',  NS_CATALOG  + "post"        ),
        'source':       ('uri_list',  NS_CATALOG  + "source"      ),
    }

Work.json_schema = schema2json(Work.schema)

class Source(Entry):
    schema = {
        'id':           ('number',  NS_CATALOG  + "id"          ),
        'resource':     ('resource', NS_REM3    + "resource"    ),
        'metadata':     ('graph',   NS_REM3     + "metadata"    ),
        'cachedExternalMetadata': ('graph', NS_REM3 + "cachedExternalMetadata" ),
        'added':        ('string',  NS_CATALOG  + "added"       ),
        'addedBy':      ('string',  NS_CATALOG  + "addedBy"     ),
        'updated':      ('string',  NS_CATALOG  + "updated"     ),
        'updatedBy':    ('string',  NS_CATALOG  + "updatedBy"   ),
    }

Source.json_schema = schema2json(Source.schema)

class CatalogSource(Source):
    schema = dict(Source.schema, **{
        'sourceResource': ('resource', NS_REM3 + "sourceResource"),
    })

CatalogSource.json_schema = schema2json(CatalogSource.schema)

class ExternalSource(Source):
    schema = dict(Source.schema, **{
        'sourceResource': ('resource', NS_REM3 + "sourceResource"),
    })

ExternalSource.json_schema = schema2json(ExternalSource.schema)

class Post(Entry):
    schema = {
        'id':           ('number',    NS_CATALOG  + "id"            ),
        'resource':     ('resource',  NS_REM3     + "resource"      ),
        'postResource': ('resource',  NS_REM3     + "postResource"  ),
        'metadata':     ('graph',     NS_REM3     + "metadata"      ),
        'cachedExternalMetadata': ('graph', NS_REM3 + "cachedExternalMetadata" ),
        'posted':       ('string',    NS_CATALOG  + "posted"        ),
        'postedBy':     ('string',    NS_CATALOG  + "postedBy"      ),
        'updated':      ('string',    NS_CATALOG  + "updated"       ),
        'updatedBy':    ('string',    NS_CATALOG  + "updatedBy"     ),
    }

Post.json_schema = schema2json(Post.schema)


class RedlandStore(object):
    @staticmethod
    def get_store_config(name):
        storage_type = os.getenv('CATALOG_BACKEND_STORE_TYPE', 'hashes')
        if storage_type == 'hashes':
            options = "hash-type='{hash_type}',dir='{dir}',contexts='yes'".format(
                hash_type = os.getenv('CATALOG_BACKEND_STORE_HASH_TYPE', 'bdb'),
                dir = os.getenv('CATALOG_BACKEND_STORE_DIR', '.'),
            )

        elif storage_type in ('postgresql', 'mysql'):
            options = "host='{host}',port='{port}',database='{database}_{name}',user='{user}',password='{password}'".format(
                host = os.getenv('CATALOG_BACKEND_STORE_DB_HOST', 'localhost'),
                port = os.getenv('CATALOG_BACKEND_STORE_DB_PORT', '5432'),
                database = os.getenv('CATALOG_BACKEND_STORE_DB_NAME', 'catalog'),
                name = name,
                user = os.getenv('CATALOG_BACKEND_STORE_DB_USER', 'postgres'),
                password = os.getenv('CATALOG_BACKEND_STORE_DB_PASSWORD', ''),
            )

        elif storage_type == 'memory':
            options = "contexts='yes'"

        else:
            raise RuntimeError('invalid storage type: {0}'.format(storage_type))

        return storage_type, options

    def __init__(self, name):
        storage_type, options = self.get_store_config(name)

        self._store = RDF.Storage(
            storage_name = storage_type,
            name = name,
            options_string = options)

        self._model = RDF.Model(self._store)

    def _get_linked_work(self, predicate, object):
        """
        Return linked work for a source or post (Entry type defined by predicate)
        """
        query_statement = RDF.Statement(subject=None,
            predicate=RDF.Node(uri_string=predicate),
            object=RDF.Node(uri_string=str(object))) # no unicode allowed

        for statement, context in self._model.find_statements_context(query_statement):
            return Work.from_model(self._model, str(statement.subject))

        return None

    def _can_read(self, user, entry):
        if entry.__class__ == Work:
            return entry['creator'] == user
        elif issubclass(entry.__class__, Source):
            work = self._get_linked_work(NS_CATALOG + "source", entry['resource'])
            if work:
                # linked source
                return work['creator'] == user or work['visibility'] == 'public'
            else:
                # source without work
                return entry['addedBy'] == user
        elif entry.__class__ == Post:
            work = self._get_linked_work(NS_CATALOG + "post", entry['resource'])
            return work['creator'] == user or work['visibility'] == 'public'
        else:
            raise TypeError("Invalid entry type: {0}".format(entry.__class__))

    def _can_modify(self, user, entry):
        if entry.__class__ == Work:
            return entry['creator'] == user
        elif issubclass(entry.__class__, Source):
            work = self._get_linked_work(NS_CATALOG + "source", entry['resource'])
            if work:
                # linked source
                return work['creator'] == user and entry['addedBy'] == user
            else:
                # source without work
                return entry['addedBy'] == user
        elif entry.__class__ == Post:
            work = self._get_linked_work(NS_CATALOG + "post", entry['resource'])
            return work['creator'] == user
        else:
            raise TypeError("Invalid entry type: {0}".format(entry.__class__))

    def create_work(self, **kwargs):
        # TODO: later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
            id = kwargs['id']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        kwargs.setdefault('visibility', 'private')
        kwargs.setdefault('state', 'draft')
        kwargs.setdefault('timestamp', int(time.time()))
        kwargs.setdefault('metadataGraph', {})

        if kwargs.get('visibility') not in valid_work_visibility:
            raise ParamError('invalid visibility: {0}'.format(visibility))
        if kwargs.get('state') not in valid_work_state:
            raise ParamError('invalid state: {0}'.format(state))

        work = Work({
            'id': id,
            'resource': resource,
            'created': kwargs['timestamp'],
            'creator': user,
            'visibility': kwargs['visibility'],
            'state': kwargs['state'],
            'metadataGraph': kwargs['metadataGraph'],
        })

        work.to_model(self._model)
        self._model.sync()
        return work

    def update_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        timestamp = kwargs.pop('timestamp', int(time.time()))

        work = Work.from_model(self._model, resource)

        if not self._can_modify(user, work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(resource, user))

        work_data = work.get_data()

        # TODO: deal with created/timestamp name difference in the frontend
        #work_data['timestamp'] = work_data['created']

        new_data = kwargs.copy()
        new_data['updated'] = timestamp
        new_data['updatedBy'] = user
        work_data.update(new_data)

        # use None, for deleting a key
        # TODO: will we ever need this?
        for (key, value) in work_data.iteritems():
            if not value: del work_data[key]

        new_work = Work(work_data)
        self.delete_work(user=user, resource=resource)

        new_work.to_model(self._model)
        self._model.sync()
        return new_work

    def delete_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        work = Work.from_model(self._model, resource)

        if not self._can_modify(user, work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(resource, user))

        for subgraph_uri in work.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)

        resource_context = RDF.Node(uri_string=resource)
        self._model.remove_statements_with_context(resource_context)

        # TODO: figure out how to close the store on shutdown instead
        self._model.sync()

    def get_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))
        subgraph = kwargs.pop('subgraph', None)

        work = Work.from_model(self._model, resource)

        if not self._can_read(user, work):
            raise EntryAccessError("Can't access work {0}".format(resource))

        if not subgraph:
            return work.get_data()
        else:
            return work.get_data().get(subgraph + "Graph", {})

    def create_source(self, **kwargs):
        # TODO: later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
            id = kwargs['id']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        kwargs.setdefault('timestamp', int(time.time()))
        kwargs.setdefault('metadataGraph', {})
        kwargs.setdefault('cachedExternalMetadataGraph', {})

        source = CatalogSource({
            'id': id,
            'resource': resource,
            'metadataGraph': kwargs['metadataGraph'],
            'cachedExternalMetadataGraph': kwargs['cachedExternalMetadataGraph'],
            'addedBy': user,
            'added': kwargs['timestamp'],
            'sourceResource': kwargs['sourceResource'],
        })

        source.to_model(self._model)

        # how else can we figure out the work id?
        scheme, netloc, path, query, fragment = urlsplit(resource)
        if path.startswith("/works/"):
            path = "/".join(path.split("/")[0:3])

            work_resource = urlunsplit((scheme, netloc, path, query, fragment))
            work_subject = RDF.Node(uri_string=work_resource)

            statement = RDF.Statement(work_subject,
                RDF.Node(uri_string=NS_CATALOG + "source"),
                RDF.Node(uri_string=resource))

            if (statement, work_subject) not in self._model:
                self._model.append(statement, context=work_subject)
        elif path.startswith("/users/"):
            pass
        else:
            raise ParamError("Resource {0} doesn't look like a source URI".format(resource))

        self._model.sync()
        return source

    def update_source(self, **kwargs):
        # TODO: later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))
        timestamp = kwargs.pop('timestamp', int(time.time()))

        source = CatalogSource.from_model(self._model, resource)

        if not self._can_modify(user, source):
            raise EntryAccessError("Source {0} can't be modified by {1}".format(resource, user))

        source_data = source.get_data()
        new_data = kwargs.copy()
        new_data['updated'] = timestamp
        new_data['updatedBy'] = user
        source_data.update(new_data)

        # use None, for deleting a key
        # TODO: will we ever need this?
        for (key, value) in source_data.iteritems():
            if not value: del source_data[key]

        new_source = CatalogSource(source_data)
        self.delete_source(user=user, resource=resource)

        new_source.to_model(self._model)
        self._model.sync()
        return new_source

    def delete_source(self, unlink=False, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        source = CatalogSource.from_model(self._model, resource)

        if not self._can_modify(user, source):
            raise EntryAccessError("Source {0} can't be modified by {1}".format(resource, user))

        # delete any links to this source
        if unlink:
            # is it safe to assume that catalog:source will precisely
            # enumerate works derived from this source?
            query_statement = RDF.Statement(subject=None,
                predicate=RDF.Node(uri_string=NS_CATALOG + "source"),
                object=RDF.Node(uri_string=resource))

            for statement, context in self._model.find_statements_context(query_statement):
                self._model.remove_statement(statement, context)

        # delete source data
        for subgraph_uri in source.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)
        self._model.remove_statements_with_context(RDF.Node(uri_string=resource))
        self._model.sync()

    def get_source(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))
        subgraph = kwargs.pop('subgraph', None)

        source = CatalogSource.from_model(self._model, resource)

        if not self._can_read(user, source):
            raise EntryAccessError("Can't access source {0}".format(resource))

        if not subgraph:
            return source.get_data()
        else:
            return source.get_data().get(subgraph + "Graph", {})

    def get_sources(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        sources = []

        # how else can we figure out the work/user id?
        scheme, netloc, path, query, fragment = urlsplit(resource)
        if path.startswith("/works"):
            path = "/".join(path.split("/")[0:3])

            work_resource = urlunsplit((scheme, netloc, path, query, fragment))
            work = self.get_work(user=user, resource=work_resource)
            for source_uri in work.get('source', []):
                source = self.get_source(user=user, resource=source_uri)
                sources.append(source)
        elif path.startswith("/users"):
            user_id = path.split("/")[2]
            # TODO: addedBy is an attribute specific to sources
            # but relying on it is a hack
            query_statement = RDF.Statement(subject=None,
                predicate=RDF.Node(uri_string=NS_CATALOG + "addedBy"),
                object=RDF.Node(literal=user_id))

            for statement in self._model.find_statements(query_statement):
                source_uri = statement.subject
                source = self.get_source(user=user, resource=str(source_uri))
                sources.append(source)
        else:
            raise ParamError("Resource {0} doesn't look like a source URI".format(resource))

        return sources

    def create_post(self, **kwargs):
        # TODO: later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
            id = kwargs['id']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        kwargs.setdefault('timestamp', int(time.time()))
        kwargs.setdefault('metadataGraph', {})
        kwargs.setdefault('cachedExternalMetadataGraph', {})

        post = Post({
            'id': id,
            'resource': resource,
            'postedBy': user,
            'posted': kwargs['timestamp'],
            'metadataGraph': kwargs['metadataGraph'],
            'cachedExternalMetadataGraph': kwargs['cachedExternalMetadataGraph'],
            'postResource': kwargs['postResource'],
        })

        post.to_model(self._model)

        # how else can we figure out the work id?
        scheme, netloc, path, query, fragment = urlsplit(resource)
        if path.startswith("/works/"):
            path = "/".join(path.split("/")[0:3])

            work_resource = urlunsplit((scheme, netloc, path, query, fragment))
            work_subject = RDF.Node(uri_string=work_resource)

            statement = RDF.Statement(work_subject,
                RDF.Node(uri_string=NS_CATALOG + "post"),
                RDF.Node(uri_string=resource))

            if (statement, work_subject) not in self._model:
                self._model.append(statement, context=work_subject)
        else:
            raise ParamError("Resource {0} doesn't look like a source URI".format(resource))

        self._model.sync()
        return post

    def delete_post(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        post = Post.from_model(self._model, resource)

        if not self._can_modify(user, post):
            raise EntryAccessError("Post {0} can't be modified by {1}".format(resource, user))

        # delete any links to this post
        # is it safe to assume that catalog:post will precisely
        # enumerate works linked to the post?
        query_statement = RDF.Statement(subject=None,
            predicate=RDF.Node(uri_string=NS_CATALOG + "post"),
            object=RDF.Node(uri_string=resource))

        for statement, context in self._model.find_statements_context(query_statement):
            self._model.remove_statement(statement, context)

        # delete post data
        for subgraph_uri in post.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)
        self._model.remove_statements_with_context(RDF.Node(uri_string=resource))
        self._model.sync()

    def get_post(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))
        subgraph = kwargs.pop('subgraph', None)

        post = Post.from_model(self._model, resource)

        if not self._can_read(user, post):
            raise EntryAccessError("Can't access post {0}".format(resource))

        if not subgraph:
            return post.get_data()
        else:
            return post.get_data().get(subgraph + "Graph", {})

    def get_posts(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        posts = []

        # how else can we figure out the work/user id?
        scheme, netloc, path, query, fragment = urlsplit(resource)
        if path.startswith("/works/"):
            path = "/".join(path.split("/")[0:3])

            work_resource = urlunsplit((scheme, netloc, path, query, fragment))
            work = self.get_work(user=user, resource=work_resource)
            for post_uri in work.get('post', []):
                post = self.get_post(user=user, resource=post_uri)
                posts.append(post)
        else:
            raise ParamError("Resource {0} doesn't look like a post URI".format(resource))
        return posts

    def get_complete_metadata(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs['user']
            resource = kwargs['resource']
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))
        format = kwargs.pop('format', 'json')

        work = self.get_work(user=user, resource=resource)
        if not self._can_read(user, work):
            raise EntryAccessError("Can't access work {0}".format(resource))

        query_format = """
            PREFIX dc: <http://purl.org/dc/elements/1.1/>
            PREFIX catalog: <http://catalog.commonsmachinery.se/ns#>
            PREFIX rem3: <http://scam.sf.net/schema#>

            CONSTRUCT {
                ?s ?p ?o .
                ?work dc:source ?sourceWork .
            }
            WHERE
            {
                BIND (<%s> AS ?work)
                BIND ("%s" AS ?user)

                ?work catalog:creator ?creator .
                ?work catalog:visibility ?visibility .
                ?work rem3:metadata ?workMetadata .
                ?work catalog:source ?sourceRef .
                ?sourceRef rem3:sourceResource ?sourceWork .

                { ?sourceWork rem3:metadata ?sourceMetadata . }
                UNION
                { ?sourceRef rem3:cachedExternalMetadata ?sourceMetadata . }

                GRAPH ?g { ?s ?p ?o . }

                FILTER((?g = ?workMetadata || ?g = ?sourceMetadata) &&
                       ((?visibility = "public") ||
                        (?visibility = "private") && (?creator = ?user)))
            }
        """

        query_string = query_format % (resource, user)
        query = RDF.Query(query_string)

        query_results = query.execute(self._model)

        # TODO: use results.to_string() with proper format URIs
        temp_model = RDF.Model(RDF.MemoryStorage())

        for statement in query_results.as_stream():
            temp_model.append(statement)

        result = temp_model.to_string(name=format, base_uri=None)
        return result

    def query_works_simple(self, **kwargs):
        """
        Query works using a dictionary of key=value parameter pairs to match works.
        Parameters can be given as JSON properties or predicates
        ("http://purl.org/dc/terms/title").

        Reserved kwargs:
            user
            offset
            limit
        """
        # TODO: handle this properly, later there should be proper ACLs
        try:
            user = kwargs.pop('user', None)
            offset = kwargs.pop("offset", 0)
            limit = kwargs.pop("limit", 0)
        except KeyError as e:
            key = e.args[0]
            raise ParamError("{0} not provided".format(key))

        # parse query params and convert them to predicates
        params = []
        # TODO: support resources in property values
        for key, value in kwargs.iteritems():
            url_re = "^https?:"
            if re.match(url_re, key):
                param_name = key
            else:
                if key not in Work.schema:
                    #raise RuntimeError("Unknown work property %s" % key)
                    _log.warning("Unknown work property used in query {0}".format(key))
                param_name = Work.schema[key][1]
            params.append((param_name, value))

        query_string = "SELECT ?s WHERE { \n"

        query_params_all = []

        for p, o in params:
            query_params_all.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        # query params, part 1 - private works owned by user
        if user:
            query_string += "{\n"
            query_params_1 = query_params_all[:]

            p, o = Work.schema['creator'][1], user
            query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))
            p, o = Work.schema['visibility'][1], "private"
            query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

            query_string = query_string + " . \n".join(query_params_1)
            query_string += "\n} UNION {\n"
        else:
            query_string += "{\n"

        # query params, part 2 - public works by everyone
        query_params_2 = query_params_all[:]

        p, o = Work.schema['visibility'][1], "public"
        query_params_2.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        query_string = query_string + " . \n".join(query_params_2)
        query_string += "\n}"

        # end query
        query_string = query_string + " . \n }"
        if offset > 0:
            query_string = query_string + " OFFSET %d" % offset
        if limit > 0:
            query_string = query_string + " LIMIT %d" % limit

        query = RDF.Query(query_string)

        query_results = query.execute(self._model)
        results = []
        for result in query_results:
            work_subject = result['s']
            results.append(self.get_work(user=user, resource=str(work_subject)))
        return results


class PublicStore(RedlandStore):
    def _can_read(user, entry):
        return True

    def _can_modify(user, entry):
        return True

    def query_sparql(self, query_string=None, results_format="json", **kwargs):
        query = RDF.Query(querystring=query_string, query_language="sparql")
        query_results = query.execute(self._model)
        if query.get_limit() < 0:
            query.set_limit(50)

        if results_format == "json":
            format_uri = "http://www.mindswap.org/%7Ekendall/sparql-results-json/"
        elif results_format == "n3":
            format_uri = "http://www.w3.org/TeamSubmission/turtle/"
        elif results_format == "html":
            format_uri = "http://www.w3.org/1999/xhtml/"
        else:
            format_uri = "http://www.w3.org/TR/2008/REC-rdf-sparql-XMLres-20080115/"
        return query_results.to_string(format_uri=format_uri)
