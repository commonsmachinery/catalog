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

work_properties_rdf = {
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

work_properties_json = {}
for key, value in work_properties_rdf.iteritems():
    work_properties_json[value] = key

work_properties_types = {
    'id': int,
    'created': int,
    'updated': int,
}

# TODO: this should be configurable
WORK_METADATA_SUBJECT = "http://localhost:8004/works/%s/metadata"
WORK_RESOURCE_SUBJECT = "http://localhost:8004/works/%s"
CREATE_WORK_SUBJECT = "http://localhost:8004/works"

DATABASE_META_CONTEXT = "http://catalog.commonsmachinery.se/db"


class RedlandStore(object):
    def __init__(self, name):
        self._store = RDF.HashStorage(name, options="hash-type='bdb',dir='.',contexts='yes'")
        self._model = RDF.Model(self._store)

    def _add_statement(self, subject_node, predicate_node, object_node, context):
        statement = RDF.Statement(subject_node, predicate_node, object_node)
        if (statement, context) not in self._model:
            self._model.append(statement, context=context)

    def _get_metadata_context(self, id):
        """
        Convenience method to get metadata context (subject) for a work.
        """
        if isinstance(id, RDF.Node):
            context = id
        else:
            context = RDF.Node(uri_string = str(WORK_RESOURCE_SUBJECT % id))

        for statement in self._model.as_stream(context=context):
            if unicode(statement.predicate.uri) == work_properties_rdf['metadata']:
                return str(statement.object.uri)

    def store_work(self, user = None, timestamp = None, metadataGraph = None,
                   visibility = 'private', state = 'draft', **kwargs):
        if kwargs:
            print 'store_work: ignoring args:', kwargs

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')

        if timestamp is None:
            timestamp = int(time.time())

        if visibility not in valid_work_visibility:
            raise ParamError('invalid visiblity: {0}'.format(visiblity))

        if state not in valid_work_state:
            raise ParamError('invalid state: {0}'.format(state))

        data = {}

        # TODO: get work IDs from somewhere...
        work_id = timestamp

        work_subject = RDF.Node(uri_string = WORK_RESOURCE_SUBJECT % work_id)
        metadata_subject = RDF.Node(uri_string = WORK_METADATA_SUBJECT % work_id)

        # TODO: check that metadataGraph is proper RDF/JSON
        if not metadataGraph:
            metadataGraph = {}

        for subject in metadataGraph.keys():
            if subject == CREATE_WORK_SUBJECT:
                # alias for the new subject of the work
                subject_node = work_subject
            else:
                subject_node = RDF.Node(uri_string=str(subject))

            for predicate in metadataGraph[subject].keys():
                predicate_node = RDF.Node(uri_string=str(predicate))

                for object in metadataGraph[subject][predicate]:
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

                    self._add_statement(subject_node, predicate_node, object_node, metadata_subject)


        # Save the main work properties

        context = work_subject

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['id']),
                            RDF.Node(literal = str(work_id)),
                            context)

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['resource']),
                            work_subject,
                            context)

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['metadata']),
                            metadata_subject,
                            context)

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['created']),
                            RDF.Node(literal = str(timestamp)),
                            context)

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['creator']),
                            RDF.Node(literal = str(user)),
                            context)

        # TODO: Visibility and state should really be controlled
        # vocubularies with full URIs, but not now.
        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['visibility']),
                            RDF.Node(literal = str(visibility)),
                            context)

        self._add_statement(work_subject,
                            RDF.Node(uri_string = work_properties_rdf['state']),
                            RDF.Node(literal = str(state)),
                            context)

        # TODO: figure out how to close the store on shutdown instead
        self._model.sync()
        return work_id


    def update_work(self, **kwargs):
        id = kwargs.pop('id', None)
        user = kwargs.pop('user', None)

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')
        if not id:
            raise RuntimeError('no ID parameter')

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
        id = kwargs.pop('id', None)
        user = kwargs.pop('user', None)

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')
        if not id:
            raise RuntimeError('no ID parameter')

        work = self.get_work(user=user, id=id)

        if work['creator'] != user:
            raise RuntimeError("Error accessing work owned by another user")

        resource_context = RDF.Node(uri_string=WORK_RESOURCE_SUBJECT % id)
        metadata_context = RDF.Node(uri_string=self._get_metadata_context(id))

        self._model.remove_statements_with_context(resource_context)
        self._model.remove_statements_with_context(metadata_context)

        # TODO: figure out how to close the store on shutdown instead
        self._model.sync()

    def get_work(self, **kwargs):
        data = {}

        # TODO: handle this propperly, this was put just to make the template infrastructure.
        id = kwargs.pop('id', None)
        user = kwargs.pop('user', None)

        # TODO: later there should be proper ACLs
        if not user:
            raise RuntimeError('no user')

        if not id:
            raise RuntimeError('no ID parameter')

        if isinstance(id, RDF.Node):
            context = id
        else:
            context = RDF.Node(uri_string = str(WORK_RESOURCE_SUBJECT % id))

        for statement in self._model.as_stream(context=context):
            property_uri = unicode(statement.predicate.uri)
            if property_uri not in work_properties_json:
                raise RuntimeError("Unknown work property %s" % property_uri)

            property_name = work_properties_json[property_uri]
            if statement.object.is_literal():
                property_value = statement.object.literal[0]
                if property_name in work_properties_types:
                    property_value = work_properties_types[property_name](property_value)

            elif statement.object.is_resource():
                property_value = unicode(statement.object.uri)

            else:
                raise RuntimeError('cannot handle blank nodes in work properties: %s' % statement)

            data[unicode(property_name)] = property_value

        if len(data) == 0:
            raise WorkNotFound(id)

        if data["visibility"] == "private" and data["creator"] != "user":
            raise RuntimeError("Error accessing private work owned by different user")

        data["metadataGraph"] = {}
        metadata_graph = data["metadataGraph"]

        context = RDF.Node(uri_string = str(WORK_METADATA_SUBJECT % id))

        for statement in self._model.as_stream(context=context):
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

        return data

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
                if key not in work_properties_rdf:
                    #raise RuntimeError("Unknown work property %s" % key)
                    print "Warning: unknown work property used in query (%s)" % key
                param_name = work_properties_rdf[key]
            params.append((param_name, value))

        query_string = "SELECT ?s WHERE { \n"

        query_params_all = []

        for p, o in params:
            query_params_all.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        # query params, part 1 - private works owned by user
        query_string += "{\n"
        query_params_1 = query_params_all[:]

        p, o = work_properties_rdf['creator'], user
        query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))
        p, o = work_properties_rdf['visibility'], "private"
        query_params_1.append('{ ?s <%s> "%s" }' % (p, o.replace('"', '\\"')))

        query_string = query_string + " . \n".join(query_params_1)

        # query params, part 2 - private works owned by user
        query_string += "\n} UNION {\n"
        query_params_2 = query_params_all[:]

        p, o = work_properties_rdf['visibility'], "public"
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
            results.append(self.get_work(user=user, id=work_subject))
        return results
