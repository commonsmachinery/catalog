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
from catalog.config import config

from catalog import get_task_logger
_log = get_task_logger(__name__)

class CatalogError(Exception): pass

class ParamError(CatalogError): pass

class EntryAccessError(CatalogError): pass

class EntryNotFoundError(CatalogError):
    def __init__(self, context):
        super(EntryNotFoundError, self).__init__('Entry not found: {0}'.format(context))

valid_work_visible = [ 'private', 'group', 'public' ]
valid_work_state = [ 'draft', 'published' ]

NS_CATALOG = "http://catalog.commonsmachinery.se/ns#"
NS_REM3 = "http://scam.sf.net/schema#"
NS_XSD = "http://www.w3.org/2001/XMLSchema#"
NS_RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"

# convert Entry schemas to dicts with URI keys for serializing to JSON
def schema2json(s):
    json_schema = {}
    for key, value in s.iteritems():
        type, uri = value
        json_schema[uri] = type, key
    return json_schema

class Entry(object):
    rdf_type = NS_REM3 + 'Entry'

    schema = {
        'type':         ('resource', NS_RDF      + 'type'        ),
        'updated':      ('string',   NS_CATALOG  + 'updated'     ),
        'updatedBy':    ('resource', NS_CATALOG  + 'updatedBy'   ),
    }

    # Map (permission1, permission2) to a WHERE clause that will be
    # wrapped in an ASK query.  The values ?entry and ?user will be
    # bound to the corresponding URIs.
    permission_queries = {}

    base_permission_query = (
        'PREFIX catalog: <http://catalog.commonsmachinery.se/ns#>\n'
        'PREFIX rem3: <http://scam.sf.net/schema#>\n'
        'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n'
        'ASK {{ VALUES (?entry ?user) {{ (<{entry}> <{user}>) }} {query} }}'
    )

    def __init__(self, uri, dict):
        self._uri = str(uri)
        self._dict = dict
        self._dict['type'] = self.__class__.rdf_type

    def __getitem__(self, name):
        if self._dict.has_key(name):
            return self._dict[name]
        else:
            raise AttributeError("Unknown entry property: %s" % name)

    @property
    def uri(self):
        return self._uri

    def get_data(self):
        return self._dict

    # TODO: check the usage of this method below and consider alternatives
    def get(self, key, default=None):
        return self._dict.get(key, default)

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
    def from_model(cls, model, uri, user_uri = None):
        """
        Construct an entry from the store.
        """
        context = RDF.Node(RDF.Uri(uri))
        data = {}

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

        entry = cls(uri, data)
        entry.permissions_from_model(model, user_uri)

        return entry

    def to_model(self, model):
        context = RDF.Node(RDF.Uri(self._uri))
        statements = []

        for key, value in self.__class__.schema.iteritems():
            property_name = key
            property_type, property_uri = value

            # make sure graph fields exist, even if the graph is empty
            if property_type == "graph" and not self._dict.has_key(property_name):
                self._dict[key] = self._uri + "/" + property_name

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
                                object_node = RDF.Node(RDF.Uri(value))
                            elif type == "bnode":
                                object_node = RDF.Node(blank=str(value))

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


    def permissions_from_model(self, model, user_uri = None):
        """Set the permissions property with a map of permissions
        for the user accessing the entry.  If user_uri is None,
        an empty map of permissions is set.
        """

        entry_perms = {}
        if user_uri is not None:
            for perms, query_string in self.permission_queries.iteritems():
                assert type(perms) is type(())

                query = RDF.Query(self.base_permission_query.format(
                    query=query_string,
                    entry=str(self.uri),
                    user=str(user_uri)))

                result = query.execute(model)
                if result.get_boolean():
                    for p in perms:
                        entry_perms[p] = True

        self._dict['permissions'] = entry_perms

Entry.json_schema = schema2json(Entry.schema)


class Work(Entry):
    rdf_type = NS_CATALOG + 'Work'

    schema = dict(Entry.schema, **{
        'id':           ('number',    NS_CATALOG  + 'id'          ),
        'resource':     ('resource',  NS_REM3     + 'resource'    ),
        'metadata':     ('graph',     NS_REM3     + 'metadata'    ),
        'created':      ('string',    NS_CATALOG  + 'created'     ),
        'creator':      ('resource',  NS_CATALOG  + 'creator'     ),
        'visible':      ('string',    NS_CATALOG  + 'visible'     ),
        'state':        ('string',    NS_CATALOG  + 'state'       ),
        'post':         ('uri_list',  NS_CATALOG  + 'post'        ),
        'source':       ('uri_list',  NS_CATALOG  + 'source'      ),
    })

    owner_permissions = { 'read': True,
                          'edit': True,
                          'delete': True,
                      }

    permission_queries = {
        ('read', ): ('{ ?entry catalog:creator ?user } '
                     'UNION '
                     '{ ?entry catalog:visible "public" }'),
        ('edit', 'delete'): '?entry catalog:creator ?user',
    }


Work.json_schema = schema2json(Work.schema)

class Source(Entry):
    rdf_type = NS_CATALOG + 'Source'

    schema = dict(Entry.schema, **{
        'id':           ('number',   NS_CATALOG  + 'id'          ),
        'metadata':     ('graph',    NS_REM3     + 'metadata'    ),
        'cachedExternalMetadata': ('graph', NS_REM3 + 'cachedExternalMetadata' ),
        'added':        ('string',   NS_CATALOG  + 'added'       ),
        'addedBy':      ('resource', NS_CATALOG  + 'addedBy'     ),
        'resource':     ('resource', NS_REM3     + 'resource'    ),
    })

    permission_queries = {
        ('read', ): (
            '{ ?work catalog:source ?entry . ?work catalog:creator ?user . } '
            'UNION '
            # Stock sources (to go away...)
            '{ ?entry catalog:addedBy ?user . } '
            'UNION '
            '{ ?work catalog:source ?entry . ?work catalog:visible "public" }'
        ),

        ('edit', 'delete'): (
            '{ ?work catalog:source ?entry . ?work catalog:creator ?user . } '
            'UNION '
            # Stock sources (to go away...)
            '{ ?entry catalog:addedBy ?user . } '
        ),
    }

Source.json_schema = schema2json(Source.schema)

class Post(Entry):
    rdf_type = NS_CATALOG + 'Post'

    schema = dict(Entry.schema, **{
        'id':           ('number',    NS_CATALOG  + 'id'            ),
        'resource':     ('resource',  NS_REM3     + 'resource'      ),
        'metadata':     ('graph',     NS_REM3     + 'metadata'      ),
        'cachedExternalMetadata': ('graph', NS_REM3 + 'cachedExternalMetadata' ),
        'posted':       ('string',    NS_CATALOG  + 'posted'        ),
        'postedBy':     ('resource',  NS_CATALOG  + 'postedBy'      ),
    })

    permission_queries = {
        ('read', ): (
            '{ ?work catalog:post ?entry . ?work catalog:creator ?user . } '
            'UNION '
            '{ ?work catalog:post ?entry . ?work catalog:visible "public" }'
        ),

        ('edit', 'delete'): (
            '{ ?work catalog:post ?entry . ?work catalog:creator ?user . }'
        ),
    }

Post.json_schema = schema2json(Post.schema)

class MainStore(object):
    @staticmethod
    def get_store_options(name):
        storage_type = config.CATALOG_BACKEND_STORE_TYPE

        if storage_type in ('postgresql', 'mysql'):
            options = "host='{host}',port='{port}',database='{database}_{name}',user='{user}',password='{password}'".format(
                host = config.CATALOG_BACKEND_STORE_DB_HOST,
                port = config.CATALOG_BACKEND_STORE_DB_PORT,
                database = config.CATALOG_BACKEND_STORE_DB_NAME,
                name = name,
                user = config.CATALOG_BACKEND_STORE_DB_USER,
                password = config.CATALOG_BACKEND_STORE_DB_PASSWORD,
            )

        elif storage_type == 'memory':
            options = "contexts='yes'"

        elif storage_type == 'sqlite':
            options = ""

        else:
            raise RuntimeError('invalid storage type: {0}'.format(storage_type))

        return storage_type, options

    def __init__(self, name):
        storage_type, options = self.get_store_options(name)

        # workaround: sqlite doesn't support 'dir' so prepend directory to the name
        if storage_type == 'sqlite':
            name = os.path.abspath(os.path.join(config.CATALOG_DATA_DIR, name))

        self._store = RDF.Storage(storage_name=storage_type, name=name, options_string=options)
        self._model = RDF.Model(self._store)

    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        self._model.sync()

    def _get_linked_work(self, predicate, object):
        """
        Return linked work for a source or post (Entry type defined by predicate)
        """
        query_statement = RDF.Statement(None, RDF.Uri(predicate), RDF.Uri(object))

        for statement, context in self._model.find_statements_context(query_statement):
            entry_type = self._model.get_targets(statement.subject, RDF.Uri(NS_RDF + 'type')).current()
            # we don't have User entries yet, so type is None occassionally
            if entry_type is not None and entry_type.uri == RDF.Uri(Work.rdf_type):
                return Work.from_model(self._model, str(statement.subject))

        return None

    def _can_access(self, access, entry):
        return access in entry['permissions']

    def _entry_exists(self, entry_uri):
        query_statement = RDF.Statement(RDF.Uri(entry_uri), RDF.Uri(NS_CATALOG + "id"), None)

        for statement, context in self._model.find_statements_context(query_statement):
            return True

    def create_work(self, timestamp, user_uri, work_uri, work_data):
        if self._entry_exists(work_uri):
            raise CatalogError("Entry {0} already exists".format(work_uri))

        work_data = work_data.copy()

        work_data['created'] = timestamp
        work_data.setdefault('visible', 'private')
        work_data.setdefault('state', 'draft')
        work_data.setdefault('metadataGraph', {})

        if work_data['visible'] not in valid_work_visible:
            raise ParamError('invalid visible: {0}'.format(visible))
        if work_data['state'] not in valid_work_state:
            raise ParamError('invalid state: {0}'.format(state))

        work = Work(work_uri, {
            'id': work_data['id'],
            'resource': work_uri,
            'created': work_data['created'],
            'creator': user_uri,
            'visible': work_data['visible'],
            'state': work_data['state'],
            'metadataGraph': work_data['metadataGraph'],
            'permissions': Work.owner_permissions,
        })

        work.to_model(self._model)
        return work.get_data()

    def update_work(self, timestamp, user_uri, work_uri, work_data):
        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('edit', work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(work_uri, user_uri))

        new_data = work.get_data()

        if 'visible' in work_data:
            if work_data['visible'] not in valid_work_visible:
                raise ParamError('invalid visible: {0}'.format(work_data['visible']))
            new_data['visible'] = work_data['visible']

        if 'state' in work_data:
            if work_data['state'] not in valid_work_state:
                raise ParamError('invalid state: {0}'.format(work_data['state']))
            new_data['state'] = work_data['state']

        if 'metadataGraph' in work_data:
            new_data['metadataGraph'] = work_data['metadataGraph']

        new_data['updated'] = timestamp
        new_data['updatedBy'] = user_uri

        new_work = Work(work_uri, new_data)
        self.delete_work(user_uri=user_uri, work_uri=work_uri)

        new_work.to_model(self._model)
        return new_work.get_data()

    def delete_work(self, user_uri, work_uri, linked_entries=False):
        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('delete', work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(work_uri, user_uri))

        if linked_entries:
            for source_uri in work.get('source', []):
                self.delete_source(user_uri=user_uri, source_uri=source_uri, unlink=True)

            for post_uri in work.get('post', []):
                self.delete_post(user_uri=user_uri, post_uri=post_uri, unlink=True)

        for subgraph_uri in work.get_subgraphs():
            subgraph_context = RDF.Node(RDF.Uri(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)

        work_context = RDF.Node(RDF.Uri(work_uri))
        self._model.remove_statements_with_context(work_context)

    def get_work(self, user_uri, work_uri, subgraph=None):
        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('read', work):
            raise EntryAccessError("Can't access work {0}".format(work_uri))

        if not subgraph:
            return work.get_data()
        elif subgraph == 'metadata':
            return work.get_data().get(subgraph + "Graph", {})
        else:
            raise ParamError('invalid metadata graph: {0}'.format(subgraph))

    def get_linked_work(self, entry_uri):
        # TODO: implement in SPARQL and unify with _get_linked_work above
        work = self._get_linked_work(NS_CATALOG + "source", entry_uri)
        if not work:
            work = self._get_linked_work(NS_CATALOG + "post", entry_uri)
        return work

    def create_work_source(self, timestamp, user_uri, work_uri, source_uri, source_data):
        if self._entry_exists(source_uri):
            raise CatalogError("Entry {0} already exists".format(source_uri))

        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('edit', work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(work_uri, user_uri))

        try:
            source_id = source_data['id']
            metadata_graph = source_data.get('metadataGraph', {})
            cem_graph = source_data.get('cachedExternalMetadataGraph', {})
            resource = source_data['resource']
        except KeyError, e:
            raise ParamError(str(e))

        source = Source(source_uri, {
            'id': source_id,
            'metadataGraph': metadata_graph,
            'cachedExternalMetadataGraph': cem_graph,
            'addedBy': user_uri,
            'added': timestamp,
            'resource': resource,
            'permissions': Work.owner_permissions,
        })

        source.to_model(self._model)

        # link the source to work
        work_subject = RDF.Node(RDF.Uri(work_uri))
        statement = RDF.Statement(work_subject, RDF.Uri(NS_CATALOG + "source"), RDF.Uri(source_uri))

        if (statement, work_subject) not in self._model:
            self._model.append(statement, context=work_subject)

        return source.get_data()

    def create_stock_source(self, timestamp, user_uri, source_uri, source_data):
        if self._entry_exists(source_uri):
            raise CatalogError("Entry {0} already exists".format(source_uri))

        try:
            source_id = source_data['id']
            metadata_graph = source_data.get('metadataGraph', {})
            cem_graph = source_data.get('cachedExternalMetadataGraph', {})
            resource = source_data['resource']
        except KeyError, e:
            raise ParamError(str(e))

        source = Source(source_uri, {
            'id': source_id,
            'metadataGraph': metadata_graph,
            'cachedExternalMetadataGraph': cem_graph,
            'addedBy': user_uri,
            'added': timestamp,
            'resource': resource,
            'permissions': Work.owner_permissions,
        })

        source.to_model(self._model)

        # link the source to user
        user_subject = RDF.Node(RDF.Uri(user_uri))
        statement = RDF.Statement(user_subject, RDF.Uri(NS_CATALOG + "source"), RDF.Uri(source_uri))

        if (statement, user_subject) not in self._model:
            # TODO: do we need context for user-related stuff?
            self._model.append(statement, context=user_subject)

        return source.get_data()

    def update_source(self, timestamp, user_uri, source_uri, source_data):
        source = Source.from_model(self._model, source_uri, user_uri)

        if not self._can_access('edit', source):
            raise EntryAccessError("Source {0} can't be modified by {1}".format(source_uri, user_uri))

        old_data = source.get_data()
        editable_keys = ['metadataGraph', 'cachedExternalMetadataGraph', 'resource']
        new_data = {key: source_data[key] for key in editable_keys if key in source_data}

        new_data['updated'] = timestamp
        new_data['updatedBy'] = user_uri
        old_data.update(new_data)

        new_source = Source(source_uri, old_data)
        self.delete_source(user_uri=user_uri, source_uri=source_uri, unlink=False)

        new_source.to_model(self._model)
        return new_source.get_data()

    def delete_source(self, user_uri, source_uri, unlink=True):
        source = Source.from_model(self._model, source_uri, user_uri)

        if not self._can_access('delete', source):
            raise EntryAccessError("Source {0} can't be modified by {1}".format(source_uri, user_uri))

        # delete the link to work, if exists
        if unlink:
            # is it safe to assume that catalog:source will precisely
            # enumerate works and users linked to this source?
            query_statement = RDF.Statement(None, RDF.Uri(NS_CATALOG + "source"), RDF.Uri(source_uri))

            for statement, context in self._model.find_statements_context(query_statement):
                self._model.remove_statement(statement, context)

        # delete source data
        for subgraph_uri in source.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)
        self._model.remove_statements_with_context(RDF.Node(RDF.Uri(source_uri)))

    def get_source(self, user_uri, source_uri, subgraph=None):
        source = Source.from_model(self._model, source_uri, user_uri)

        if not self._can_access('read', source):
            raise EntryAccessError("Can't access source {0}".format(source_uri))

        if not subgraph:
            return source.get_data()
        elif subgraph in ('metadata', 'cachedExternalMetadata'):
            return source.get_data().get(subgraph + "Graph", {})
        else:
            raise ParamError('invalid metadata graph: {0}'.format(subgraph))


    def get_work_sources(self, user_uri, work_uri):
        sources = []

        work = self.get_work(user_uri=user_uri, work_uri=work_uri)
        for source_uri in work.get('source', []):
            source = self.get_source(user_uri=user_uri, source_uri=source_uri)
            sources.append(source)
        return sources

    def get_stock_sources(self, user_uri):
        sources = []


        query_statement = RDF.Statement(RDF.Uri(user_uri), RDF.Uri(NS_CATALOG + "source"), None)

        for statement in self._model.find_statements(query_statement):
            source_uri = str(statement.object)

            source = self.get_source(user_uri=user_uri, source_uri=source_uri)
            sources.append(source)
        return sources

    def create_post(self, timestamp, user_uri, work_uri, post_uri, post_data):
        if self._entry_exists(post_uri):
            raise CatalogError("Entry {0} already exists".format(post_uri))

        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('edit', work):
            raise EntryAccessError("Work {0} can't be modified by {1}".format(work_uri, user_uri))

        try:
            post_id = post_data['id']
            metadataGraph = post_data.get('metadataGraph', {})
            cemGraph = post_data.get('cachedExternalMetadataGraph', {})
            resource = post_data['resource']
        except KeyError, e:
            raise ParamError(str(e))

        post = Post(post_uri, {
            'id': post_id,
            'postedBy': user_uri,
            'posted': timestamp,
            'metadataGraph': metadataGraph,
            'cachedExternalMetadataGraph': cemGraph,
            'resource': resource,
            'permissions': Work.owner_permissions,
        })

        post.to_model(self._model)

        work_subject = RDF.Node(RDF.Uri(work_uri))

        statement = RDF.Statement(work_subject, RDF.Uri(NS_CATALOG + "post"), RDF.Uri(post_uri))

        if (statement, work_subject) not in self._model:
            self._model.append(statement, context=work_subject)

        return post.get_data()

    def update_post(self, timestamp, user_uri, post_uri, post_data):
        post = Post.from_model(self._model, post_uri, user_uri)

        if not self._can_access('edit', post):
            raise EntryAccessError("Post {0} can't be modified by {1}".format(post_uri, user_uri))

        old_data = post.get_data()
        editable_keys = ['metadataGraph', 'cachedExternalMetadataGraph', 'resource']
        new_data = {key: post_data[key] for key in editable_keys if key in post_data}

        new_data['updated'] = timestamp
        new_data['updatedBy'] = user_uri
        old_data.update(new_data)

        new_post = Post(post_uri, old_data)
        self.delete_post(user_uri=user_uri, post_uri=post_uri, unlink=False)

        new_post.to_model(self._model)
        return new_post.get_data()

    def delete_post(self, user_uri, post_uri, unlink=True):
        post = Post.from_model(self._model, post_uri, user_uri)

        if not self._can_access('delete', post):
            raise EntryAccessError("Post {0} can't be modified by {1}".format(post_uri, user_uri))

        # delete the link to work, if exists
        if unlink:
            # is it safe to assume that catalog:post will precisely
            # enumerate works linked to the post?
            query_statement = RDF.Statement(None, RDF.Uri(NS_CATALOG + "post"), RDF.Uri(post_uri))

            for statement, context in self._model.find_statements_context(query_statement):
                self._model.remove_statement(statement, context)

        # delete post data
        for subgraph_uri in post.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)
        self._model.remove_statements_with_context(RDF.Node(RDF.Uri(post_uri)))

    def get_post(self, user_uri, post_uri, subgraph=None):
        post = Post.from_model(self._model, post_uri, user_uri)

        if not self._can_access('read', post):
            raise EntryAccessError("Can't access post {0}".format(post_uri))

        if not subgraph:
            return post.get_data()
        elif subgraph in ('metadata', 'cachedExternalMetadata'):
            return post.get_data().get(subgraph + "Graph", {})
        else:
            raise ParamError('invalid metadata graph: {0}'.format(subgraph))

    def get_posts(self, user_uri, work_uri):
        posts = []

        work = self.get_work(user_uri=user_uri, work_uri=work_uri)
        for post_uri in work.get('post', []):
            post = self.get_post(user_uri=user_uri, post_uri=post_uri)
            posts.append(post)

        return posts

    def get_complete_metadata(self, user_uri, work_uri, format='json'):
        work = Work.from_model(self._model, work_uri, user_uri)

        if not self._can_access('read', work):
            raise EntryAccessError("Can't access work {0}".format(work_uri))

        if format not in ('ntriples', 'rdfxml', 'json'):
            raise ParamError('invalid RDF format: {0}'.format(format))

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
                BIND (<%s> AS ?user)

                ?work catalog:creator ?creator .
                ?work catalog:visible ?visible .
                ?work rem3:metadata ?workMetadata .
                ?work catalog:source ?sourceRef .
                ?sourceRef rem3:resource ?sourceWork .

                { ?sourceWork rem3:metadata ?sourceMetadata . }
                UNION
                { ?sourceRef rem3:cachedExternalMetadata ?sourceMetadata . }

                GRAPH ?g { ?s ?p ?o . }

                FILTER((?g = ?workMetadata || ?g = ?sourceMetadata) &&
                       ((?visible = "public") ||
                        (?visible = "private") && (?creator = ?user)))
            }
        """

        query_string = query_format % (work_uri, user_uri)
        query = RDF.Query(query_string)

        query_results = query.execute(self._model)

        # TODO: use results.to_string() with proper format URIs
        temp_model = RDF.Model(RDF.MemoryStorage())

        for statement in query_results.as_stream():
            temp_model.append(statement)

        result = temp_model.to_string(name=format, base_uri=None)
        return result

    def query_works_simple(self, user_uri, offset, limit, query):
        """
        Query works using a dictionary of key=value parameter pairs to match works.
        Query parameters can be given as JSON properties or predicates
        ("http://purl.org/dc/terms/title").
        """

        # parse query params and convert them to predicates
        params = []
        if query:
            # TODO: support resources in property values
            for key, value in query.iteritems():
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
        if user_uri:
            query_string += "{\n"
            query_params_1 = query_params_all[:]

            p, o = Work.schema['creator'][1], user_uri
            query_params_1.append('{ ?s <%s> <%s> }' % (p, o.replace('"', '\\"')))
            p, o = Work.schema['visible'][1], "private"
            query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

            query_string = query_string + " . \n".join(query_params_1)
            query_string += "\n} UNION {\n"
        else:
            query_string += "{\n"

        # query params, part 2 - public works by everyone
        query_params_2 = query_params_all[:]

        p, o = Work.schema['visible'][1], "public"
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
            results.append(self.get_work(user_uri=user_uri, work_uri=str(work_subject)))
        return results


class PublicStore(MainStore):
    # In public store only read access is allowed, but on the other
    # hand all objects can be accessed
    def _can_access(self, access, entry):
        return True

    def query_sparql(self, query_string=None, results_format="json"):
        if results_format not in ('json', 'n3', 'xml'):
            raise ParamError('invalid SPARQL result format: {0}'.format(results_format))

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
