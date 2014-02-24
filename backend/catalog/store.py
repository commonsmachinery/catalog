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

class ParamError(Exception): pass

class WorkNotFound(Exception):
    def __init__(self, id):
        super(Exception, self).__init__(self, 'work not found: {0}'.format(id))


valid_work_visibility = [ 'private', 'group', 'public' ]
valid_work_state = [ 'draft', 'published' ]


NS_CATALOG = "http://catalog.commonsmachinery.se/ns#"
NS_REM3 = "http://scam.sf.net/schema#"
NS_XSD = "http://www.w3.org/2001/XMLSchema#"

work_property_uris = {
    'id':           NS_CATALOG  + "id",
    'resource':     NS_REM3     + "resource",
    'metadata':     NS_REM3     + "metadata",
    'created':      NS_CATALOG  + "created",
    'creator':      NS_CATALOG  + "creator",
    'updated':      NS_CATALOG  + "updated",
    'updatedBy':    NS_CATALOG  + "updatedBy",
    'visibility':   NS_CATALOG  + "visibility",
    'state':        NS_CATALOG  + "state",
    'post':         NS_CATALOG  + "post",
    'source':       NS_CATALOG  + "source",
}


METADATA_GRAPH = NS_REM3 + "metadata"
CACHED_METADATA_GRAPH = NS_REM3 + "cachedExternalMetadata"

CREATE_WORK_SUBJECT = "http://localhost:8004/works"
#DATABASE_META_CONTEXT = "http://catalog.commonsmachinery.se/db"

# convert Entry schemas to dicts with URI keys for serializing to JSON
def schema2json(s):
    json_schema = {}
    for key, value in s.iteritems():
        type, uri = value
        json_schema[uri] = type, key
    return json_schema

# get context Node for a given id, Entry class and subgraph (metadata, cachedExternalMetadata or None)
# TODO: this should be configurable
def get_context_node(cls, graph, id):
    context_map = {
        (Work, None): "http://localhost:8004/works/%s",
        (Work, METADATA_GRAPH): "http://localhost:8004/works/%s/metadata",

        (Post, None): "http://localhost:8004/posts/%s",
        (Post, METADATA_GRAPH): "http://localhost:8004/posts/%s/metadata",
        (Post, CACHED_METADATA_GRAPH): "http://localhost:8004/posts/%s/cachedExternalMetadata",

        (Source, None): "http://localhost:8004/sources/%s",
        (Source, METADATA_GRAPH): "http://localhost:8004/sources/%s/metadata",
        (Source, CACHED_METADATA_GRAPH): "http://localhost:8004/sources/%s/cachedExternalMetadata",
    }

    if issubclass(cls, Source):
        cls = Source

    uri_format = context_map[(cls, graph)]

    if isinstance(id, basestring) or isinstance(id, int):
        return RDF.Node(uri_string=str(uri_format % id))
    else:
        raise RuntimeError("id must be string or integer")

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

    # from_model aka get_work - get work as dict from Redland model
    @classmethod
    def from_model(cls, model, id):
        data = {}

        context = get_context_node(cls, None, id)

        for statement in model.as_stream(context=context):
            property_uri = unicode(statement.predicate.uri)
            if property_uri not in cls.json_schema:
                raise RuntimeError("Unknown work property %s" % property_uri)

            property_type, property_name = cls.json_schema[property_uri]
            if statement.object.is_literal():
                property_value = statement.object.literal[0]
                if property_type == "number":
                    property_value = int(property_value)
                elif property_type == "string" or property_type == "resource":
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
            else:
                raise RuntimeError('cannot handle blank nodes in work properties: %s' % statement)

            data[property_name] = property_value

        if len(data) == 0:
            raise WorkNotFound(id)

        return cls(data)

    def to_model(self, model):
        context = get_context_node(self.__class__, None, self._dict['id'])
        work_subject = context
        statements = []

        for key, value in self.__class__.schema.iteritems():
            property_name = key
            property_type, property_uri = value

            # make sure graph fields exist, even if the graph is empty
            if property_type == "graph" and not self._dict.has_key(property_name):
                self._dict[key] = get_context_node(self.__class__, property_uri, self._dict['id'])
            if property_type == "graph" and not self._dict.has_key(property_name + "Graph"):
                self._dict[property_name + "Graph"] = {}

            if not self._dict.has_key(property_name):
                continue

            if property_type == "number" or property_type == "string":
                statement = (work_subject,
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(literal=str(self._dict[key])),
                             context)
                statements.append(statement)
            elif property_type == "resource":
                statement = (work_subject,
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=str(self._dict[key])),
                             context)
                statements.append(statement)
            elif property_type == "uri_list":
                # TODO: support source/post objects?
                for uri in self._dict[key]:
                    statement = (work_subject,
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=uri),
                             context)
                    statements.append(statement)
            elif property_type == "graph":
                statement = (work_subject,
                             RDF.Node(uri_string=property_uri),
                             RDF.Node(uri_string=str(self._dict[key])),
                             context)
                statements.append(statement)

                graph_context = RDF.Node(uri_string=str(self._dict[key]))
                graph = self._dict[property_name + "Graph"]

                for subject in graph.keys():
                    if subject == CREATE_WORK_SUBJECT:
                        # alias for the new subject of the work
                        subject_node = work_subject
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

class Post(Entry):
    schema = {
        'id':           ('number',    NS_CATALOG  + "id"          ),
        'resource':     ('resource',  NS_REM3     + "resource"    ),
        'metadata':     ('graph',     NS_REM3     + "metadata"    ),
        'cachedExternalMetadata': ('graph', NS_REM3 + "cachedExternalMetadata" ),
        'posted':       ('string',    NS_CATALOG  + "posted"     ),
        'postedBy':     ('string',    NS_CATALOG  + "postedBy"     ),
        'updated':      ('string',    NS_CATALOG  + "updated"     ),
        'updatedBy':    ('string',    NS_CATALOG  + "updatedBy"   ),
    }

Post.json_schema = schema2json(Post.schema)

class Source(Entry):
    schema = {
        'id':           ('number',  NS_CATALOG  + "id"          ),
        'metadata':     ('graph',   NS_REM3     + "metadata"    ),
        'cachedExternalMetadata': ('graph', NS_REM3 + "cachedExternalMetadata" ),
        'added':        ('string',  NS_CATALOG  + "added"     ),
        'addedBy':      ('string',  NS_CATALOG  + "addedBy"     ),
        'updated':      ('string',  NS_CATALOG  + "updated"     ),
        'updatedBy':    ('string',  NS_CATALOG  + "updatedBy"   ),
    }

Source.json_schema = schema2json(Source.schema)

class CatalogSource(Source):
    schema = dict(Source.schema, **{
        'resource': ('resource', NS_REM3 + "resource"),
    })

CatalogSource.json_schema = schema2json(CatalogSource.schema)

class ExternalSource(Source):
    schema = dict(Source.schema, **{
        'resource': ('resource', NS_REM3 + "resource"),
    })

ExternalSource.json_schema = schema2json(ExternalSource.schema)


class RedlandStore(object):
    def __init__(self, name):
        self._store = RDF.HashStorage(name, options="hash-type='bdb',dir='.',contexts='yes'")
        self._model = RDF.Model(self._store)

    def _get_work_id(self, work_subject):
        if isinstance(work_subject, basestring):
            work_subject = RDF.Node(uri_string=work_subject)

        query_statement = RDF.Statement(subject=RDF.Node(work_subject),
            predicate=RDF.Node(uri_string=work_property_uris['id']), object=None)

        for statement in self._model.find_statements(query_statement):
            return statement.object.literal[0]

    def store_work(self, user = None, timestamp = None, metadataGraph = None,
                   visibility = 'private', state = 'draft',
                   id = None, **kwargs):
        """
        Create work given the resource metadata as kwargs and work metadata as metadataGraph.
        Use id value of None to generate an ID from timestamp.
        """
        if kwargs:
            print 'store_work: ignoring args:', kwargs

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')
        if timestamp is None:
            timestamp = int(time.time())
        if visibility not in valid_work_visibility:
            raise ParamError('invalid visibility: {0}'.format(visibility))
        if state not in valid_work_state:
            raise ParamError('invalid state: {0}'.format(state))

        # TODO: get work IDs from somewhere...
        if id is None:
            id = timestamp

        # TODO: check that metadataGraph is proper RDF/JSON
        if not metadataGraph:
            metadataGraph = {}

        work = Work({
            'creator': user,
            'created': timestamp,
            'metadataGraph': metadataGraph,
            'visibility': visibility,
            'state': state,
            'id': id,
        })

        work.to_model(self._model)
        self._model.sync()
        return id

    def update_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')

        work = self.get_work(user=user, id=id)

        if work['creator'] != user:
            raise RuntimeError("Error accessing work owned by another user")

        data = kwargs.copy()
        work.update(data)

        work['id'] = id
        work['user'] = user

        self.delete_work(id=id, user=user)
        self.store_work(**work)

    def delete_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')

        work = Work.from_model(self._model, id)

        if work['creator'] != user:
            raise RuntimeError("Error accessing work owned by another user")

        for subgraph_uri in work.get_subgraphs():
            subgraph_context = RDF.Node(uri_string=str(subgraph_uri))
            self._model.remove_statements_with_context(subgraph_context)

        resource_context = get_context_node(Work, None, id)
        self._model.remove_statements_with_context(resource_context)

        # TODO: figure out how to close the store on shutdown instead
        self._model.sync()

    def get_work(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')

        work = Work.from_model(self._model, id)

        if work["visibility"] == "private" and work["creator"] != user:
            raise RuntimeError("Error accessing private work owned by different user")

        return work.get_data()

    def get_source(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')

        source = Source.from_model(self._model, id)

        return source.get_data()

    def get_post(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')

        post = Post.from_model(self._model, id)

        return post.get_data()

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
        user = kwargs.pop('user', None)
        offset = kwargs.pop("offset", 0)
        limit = kwargs.pop("limit", 0)

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')

        # parse query params and convert them to predicates
        params = []
        # TODO: support resources in property values
        for key, value in kwargs.iteritems():
            url_re = "^https?:"
            if re.match(url_re, key):
                param_name = key
            else:
                if key not in work_property_uris:
                    #raise RuntimeError("Unknown work property %s" % key)
                    print "Warning: unknown work property used in query (%s)" % key
                param_name = work_property_uris[key]
            params.append((param_name, value))

        query_string = "SELECT ?s WHERE { \n"

        query_params_all = []

        for p, o in params:
            query_params_all.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        # query params, part 1 - private works owned by user
        query_string += "{\n"
        query_params_1 = query_params_all[:]

        p, o = work_property_uris['creator'], user
        query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))
        p, o = work_property_uris['visibility'], "private"
        query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        query_string = query_string + " . \n".join(query_params_1)

        # query params, part 2 - private works owned by user
        query_string += "\n} UNION {\n"
        query_params_2 = query_params_all[:]

        p, o = work_property_uris['visibility'], "public"
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
            work_id = self._get_work_id(work_subject)
            results.append(self.get_work(user=user, id=work_id))
        return results

    def store_source(self, user=None, timestamp=None, metadataGraph=None,
                     cachedExternalMetadataGraph=None, resource=None,
                     id=None, **kwargs):
        if kwargs:
            print 'store_source: ignoring args:', kwargs

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')
        if not resource:
            raise RuntimeError('no resource')
        if timestamp is None:
            timestamp = int(time.time())

        # TODO: get work IDs from somewhere...
        if id is None:
            id = timestamp

        # TODO: check that metadataGraph is proper RDF/JSON
        if not metadataGraph:
            metadataGraph = {}
        if not cachedExternalMetadataGraph:
            cachedExternalMetadataGraph = {}

        source = CatalogSource({
            'addedBy': user,
            'added': timestamp,
            'metadataGraph': metadataGraph,
            'cachedExternalMetadataGraph': cachedExternalMetadataGraph,
            'resource': resource,
            'id': id,
        })

        source.to_model(self._model)

        # save source link triple directly, update_work currently ignores "unrelated" kwargs
        # like "source"

        work_id = self._get_work_id(resource)

        source_subject = get_context_node(Source, None, id)
        work_subject = get_context_node(Work, None, work_id)

        statement = RDF.Statement(work_subject,
            RDF.Node(uri_string=NS_CATALOG + "source"),
            source_subject)

        if (statement, work_subject) not in self._model:
            self._model.append(statement, context=work_subject)

        self._model.sync()
        return id

    # TODO: do we delete source by id or resource?
    def delete_source(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')
        resource = kwargs.pop('resource')

        work = Work.from_model(self._model, id)

        if work['creator'] != user:
            raise RuntimeError("Error accessing work owned by another user")

        # delete source link
        work_subject = get_context_node(Work, None, id)

        statement = RDF.Statement(work_subject,
            RDF.Node(uri_string=NS_CATALOG + "source"),
            RDF.Node(uri_string=resource))

        if (statement, work_subject) in self._model:
            self._model.remove_statement(statement, context=work_subject)

    def store_post(self, user=None, timestamp=None, metadataGraph=None,
                   cachedExternalMetadataGraph=None, resource=None,
                   id=None, **kwargs):
        if kwargs:
            print 'store_post: ignoring args:', kwargs

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')
        if not resource:
            raise RuntimeError('no resource')
        if timestamp is None:
            timestamp = int(time.time())

        # TODO: get work IDs from somewhere...
        if id is None:
            id = timestamp

        # TODO: check that metadataGraph is proper RDF/JSON
        if not metadataGraph:
            metadataGraph = {}
        if not cachedExternalMetadataGraph:
            cachedExternalMetadataGraph = {}

        post = Post({
            'postedBy': user,
            'posted': timestamp,
            'metadataGraph': metadataGraph,
            'cachedExternalMetadataGraph': cachedExternalMetadataGraph,
            'resource': resource,
            'id': id,
        })

        post.to_model(self._model)

        # save source link triple directly, update_work currently ignores "unrelated" kwargs
        # like "source"

        work_id = self._get_work_id(resource)

        post_subject = get_context_node(Post, None, id)
        work_subject = get_context_node(Work, None, work_id)

        statement = RDF.Statement(work_subject,
            RDF.Node(uri_string=NS_CATALOG + "post"),
            post_subject)

        if (statement, work_subject) not in self._model:
            self._model.append(statement, context=work_subject)

        self._model.sync()
        return id

    # TODO: do we delete post by id or resource?
    def delete_post(self, **kwargs):
        # TODO: handle this properly, later there should be proper ACLs
        id = kwargs.pop('id')
        user = kwargs.pop('user')
        resource = kwargs.pop('resource')

        work = Work.from_model(self._model, id)

        if work['creator'] != user:
            raise RuntimeError("Error accessing work owned by another user")

        # delete post link
        work_subject = get_context_node(Work, None, id)

        statement = RDF.Statement(work_subject,
            RDF.Node(uri_string=NS_CATALOG + "post"),
            RDF.Node(uri_string=resource))

        if (statement, work_subject) in self._model:
            self._model.remove_statement(statement, context=work_subject)
