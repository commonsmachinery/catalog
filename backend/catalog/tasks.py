# -*- coding: utf-8 -*-
#
# catalog - backend for the Commons Machinery metadata catalog
#
# Copyright 2014 Commons Machinery http://commonsmachinery.se/
#
# Authors: Artem Popov <artfwo@commonsmachinery.se>
#
# Distributed under an AGPLv3 license, please see LICENSE in the top dir.

"""
This module provides tasks for all catalog operations performed
on main and public storage backends.

Main store update tasks:

create_work, update_work, delete_work
create_work_source, create_stock_source, update_source, delete_source
create_post, delete_post

On success all the main store update tasks return the normalized Entry
(Work, Source or Post) as dict, or None in case the entry was deleted.

Public store update tasks: (never should be called directly):

public_create_work, public_update_work, public_delete_work, public_create_work_source
public_update_source, public_delete_source, public_create_post, public_delete_post

Query tasks:

get_work, get_work_sources, get_stock_sources, get_source, get_post, get_posts
get_complete_metadata, query_works_simple, query_sparql

If a CatalogError is raised when executing any of the above tasks,
the error is returned to the frontend in the form of a dict:
{ 'error': { 'type': 'FooError', 'message': 'bar' } }.

'type' can be inspected to determine the correct HTTP response code.
The message is intended for logging purposes only, and should not be
forwarded to users in production mode.
"""

from __future__ import absolute_import

import json, time

from celery import subtask
from catalog.celery import app, RedisLock, StoreTask, LockedError

from catalog.celery import on_create_work
from catalog.celery import on_update_work
from catalog.celery import on_delete_work
from catalog.celery import on_create_work_source
from catalog.celery import on_create_stock_source
from catalog.celery import on_update_source
from catalog.celery import on_delete_source
from catalog.celery import on_create_post
from catalog.celery import on_delete_post

from catalog.log import LogNotAvailable
from catalog.store import CatalogError, EntryNotFoundError

import logging
_log = logging.getLogger('catalog')


def error(e):
    return {'error': {'type': e.__class__.__name__, 'message': str(e)}}
#
# main store update tasks
#

@app.task(base=StoreTask, bind=True)
def create_work(self, user_uri, work_uri, work_data):
    """
    Create a work record in main store.
    The work will be created in public store if it's visibility is public.
    Automatically retries the task if the record is locked.

    Arguments:
        user_uri -- user identifier
        work_uri -- work identifier
        work_data -- data as dict, must conform to the Work schema.
        Keys looked for when storing the record:
            'id':           Numeric ID for work
            'visibility':   Possible values: 'private', 'group', 'public'
                            Default: 'private'
            'state':        Possible values: 'draft', 'published'
                            Default: 'draft'
            'metadataGraph': Work metadata as RDF/JSON dict, default empty
    Returns:
        Normalized work record as dict or an error type:
            ParamError: some entry data parameter is missing or invalid

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, work_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                work_data = store.create_work(timestamp, user_uri, work_uri, work_data)

                log_data = json.dumps(work_data)
                log_event.apply_async(args=('create_work', timestamp, user_uri, work_uri, None, log_data))

                on_create_work.send(sender=self, timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, work_data=work_data)
                return work_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)


@app.task(base=StoreTask, bind=True)
def update_work(self, user_uri, work_uri, work_data):
    """Update work record in main store.
    The work will be updated in public store if it's visibility is public after updating.
    Automatically retries the task if the record is locked.

    Arguments:
        user_uri -- user identifier
        work_uri -- work identifier
        work_data -- data as dict, must conform to the Work schema.
        Only listed properties will be updated:
            'visibility':   Possible values: 'private', 'group', 'public'
            'state':        Possible values: 'draft', 'published'
            'metadataGraph': Work metadata as RDF/JSON dict, default empty
    Returns:
        Normalized work record as dict or an error type:
            ParamError: some entry data parameter is missing or invalid
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, work_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                work_data = store.update_work(timestamp, user_uri, work_uri, work_data)

                log_data = json.dumps(work_data)
                log_event.apply_async(args=('update_work', timestamp, user_uri, work_uri, None, log_data))

                on_update_work.send(sender=self, timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, work_data=work_data)
                return work_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_work(self, user_uri, work_uri):
    """Delete work record from main store.
    The work will be deleted from public store if required.
    Automatically retries the task if the record is locked.

    Arguments:
        user_uri -- user identifier
        work_uri -- work identifier
    Returns:
        None or an error message in the form of dict:
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, work_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                store.delete_work(user_uri, work_uri)

                log_event.apply_async(args=('delete_work', timestamp, user_uri, work_uri, None, None))

                on_delete_work.send(sender=self, timestamp=timestamp, user_uri=user_uri, work_uri=work_uri)
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_work_source(self, user_uri, work_uri, source_uri, source_data):
    """
    Create source related to a work in main store.
    Automatically retries the task if the record is locked.
    The source will be created in public store if the related work is public.

    Arguments:
        user_uri -- user identifier
        work_uri -- work identifier
        source_uri -- source identifier
        source_data -- data as dict, must conform to the Source schema.
        Keys used when creating the record are:
            'id': Numeric source ID
            'metadataGraph': Source metadata as RDF/JSON dict, default empty
            'cachedExternalMetadataGraph': External metadata as RDF/JSON dict, default empty
            'resource': The source URI
    Returns:
        Normalized source record as dict or an error type:
            ParamError: some entry data parameter is missing or invalid
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, work_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                source_data = store.create_work_source(timestamp, user_uri, work_uri, source_uri, source_data)

                log_data = json.dumps(source_data)
                log_event.apply_async(args=('create_work_source', timestamp, user_uri, work_uri, source_uri, log_data))

                on_create_work_source.send(sender=self, timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, source_uri=source_uri, source_data=source_data)
                return source_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_stock_source(self, user_uri, source_uri, source_data):
    """
    Create a stock source (a work intended to be used later) in main store.
    Automatically retries the task if the record is locked.

    Arguments:
        user_uri -- user identifier
        source_uri -- source identifier
        source_data -- data as dict, must conform to the Source schema.
        Keys used when creating the record are:
            'id': Numeric source ID
            'metadataGraph': Source metadata as RDF/JSON dict, default empty
            'cachedExternalMetadataGraph': External metadata as RDF/JSON dict, default empty
            'resource': The source URI
    Returns:
        Normalized source record as dict or an error type:
            ParamError: some entry data parameter is missing or invalid

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, user_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                source_data = store.create_stock_source(timestamp, user_uri, source_uri, source_data)

                log_data = json.dumps(source_data)
                log_event.apply_async(args=('create_stock_source', timestamp, user_uri, None, source_uri, log_data))

                on_create_stock_source.send(sender=self, timestamp=timestamp, user_uri=user_uri, source_uri=source_uri, source_data=source_data)
                return source_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def update_source(self, user_uri, source_uri, source_data):
    """
    Update a source record (stock or work source) in main store.
    Automatically retries the task if record is locked.
    The source will be updated in public store if it's a work source and the related work is public.

    Arguments:
        user_uri -- user identifier
        source_uri -- source identifier
        source_data -- data as dict, must conform to the Source schema.
        Only the included properties will be updated:
            'metadataGraph': Source metadata as RDF/JSON dict
            'cachedExternalMetadataGraph': External metadata as RDF/JSON dict
            'resource': The source URI
    Returns:
        Normalized source record as dict or an error type:
            ParamError: some entry data parameter is missing or invalid
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, source_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                source_data = store.update_source(timestamp, user_uri, source_uri, source_data)

                log_data = json.dumps(source_data)
                log_event.apply_async(args=('update_source', timestamp, user_uri, None, source_uri, log_data))

                on_update_source.send(sender=self, timestamp=timestamp, user_uri=user_uri, source_uri=source_uri, source_data=source_data)
                return source_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_source(self, user_uri, source_uri):
    """Delete source record from main store.
    Automatically retries the task if the record is locked.
    The source will be deleted from public store if required.

    Arguments:
        user_uri -- user identifier
        source_uri -- source identifier
    Returns:
        None or an error type:
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, source_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                store.delete_source(user_uri, source_uri)

                log_event.apply_async(args=('delete_source', timestamp, user_uri, None, source_uri, None))

                on_delete_source.send(sender=self, timestamp=timestamp, user_uri=user_uri, source_uri=source_uri)
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def create_post(self, user_uri, work_uri, post_uri, post_data):
    """
    Create post related to a work in main store.
    Automatically retries the task if the record is locked.
    The post will be created in public store if the related work is public.

    Arguments:
        user_uri -- user identifier
        work_uri -- work identifier
        post_uri -- post identifier
        post_data -- data as dict, must conform to the Post schema.
        Keys used when creating the record are:
            'id': Numeric post ID
            'metadataGraph': Source metadata as RDF/JSON dict, default empty
            'cachedExternalMetadataGraph': External metadata as RDF/JSON dict, default empty
            'resource': The post URI
    Returns:
        Normalized post record as dict or an error message in the form of dict:
            ParamError: some entry data parameter is missing or invalid
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, work_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                post_data = store.create_post(timestamp, user_uri, work_uri, post_uri, post_data)

                log_data = json.dumps(post_data)
                log_event.apply_async(args=('create_post', timestamp, user_uri, work_uri, post_uri, log_data))

                on_create_post.send(sender=self, timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, post_uri=post_uri, post_data=post_data)
                return post_data
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

@app.task(base=StoreTask, bind=True)
def delete_post(self, user_uri, post_uri):
    """
    Delete post record from main store.
    Automatically retries the task if the record is locked.
    The post will be deleted from public store if required.

    Arguments:
        user_uri -- user identifier
        post_uri -- post identifier
    Returns:
        None or an error type:
            EntryAccessError: the user is not allowed to modify the entry

        Unhandled non-catalog errors will result in an exception.
    """
    try:
        with RedisLock(self.lock_db, post_uri):
            with self.main_store as store:
                timestamp = int(time.time())
                store.delete_post(user_uri, post_uri)

                log_event.apply_async(args=('delete_post', timestamp, user_uri, None, post_uri, None))

                on_delete_post.send(sender=self, timestamp=timestamp, user_uri=user_uri, post_uri=post_uri)
    except CatalogError as e:
        return error(e)
    except LockedError as e:
        raise self.retry(exc=e, countdown=1)

#
# public store update tasks
#

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_work(self, timestamp, user_uri, work_uri, work_data):
    """Create a work record in public store.
    See create_work documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + work_uri):
            with self.public_store as store:
                store.create_work(timestamp, user_uri, work_uri, work_data)
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_update_work(self, timestamp, user_uri, work_uri, work_data):
    """Update a work record in public store.
    See update_work documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + work_uri):
            self.public_store.update_work(timestamp, user_uri, work_uri, work_data)
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_work(self, timestamp, user_uri, work_uri):
    """Delete a work record in public store.
    See delete_work documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + work_uri):
            with self.public_store as store:
                store.delete_work(user_uri, work_uri, linked_entries=True)
    except EntryNotFoundError:
        pass
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_work_source(self, timestamp, user_uri, work_uri, source_uri, source_data):
    """Create a work source record in public store.
    See create_work_source documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + work_uri):
            with self.public_store as store:
                store.create_work_source(timestamp, user_uri, work_uri, source_uri, source_data)
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

#@app.task(base=StoreTask, bind=True, ignore_result=True)
#def public_create_stock_source(self, user_uri, source_uri, source_data):
#    self.public_store.create_stock_source(user_uri, source_uri, source_data)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_update_source(self, timestamp, user_uri, source_uri, source_data):
    """Update a source record in public store.
    See update_source documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + source_uri):
            with self.public_store as store:
                store.update_source(timestamp, user_uri, source_uri, source_data)
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_source(self, timestamp, user_uri, source_uri, unlink=True):
    """Delete a source record in public store.
    See delete_source documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + source_uri):
            with self.public_store as store:
                store.delete_source(user_uri, source_uri)
    except EntryNotFoundError:
        pass
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_create_post(self, timestamp, user_uri, work_uri, post_uri, post_data):
    """Create a post record in public store.
    See create_post documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + work_uri):
            with self.public_store as store:
                store.create_post(timestamp, user_uri, work_uri, post_uri, post_data)
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

@app.task(base=StoreTask, bind=True, ignore_result=True)
def public_delete_post(self, timestamp, user_uri, post_uri):
    """Delete a post record in public store.
    See delete_post documentation for description of parameters."""
    try:
        with RedisLock(self.lock_db, "public." + post_uri):
            with self.public_store as store:
                store.delete_post(user_uri, post_uri)
    except EntryNotFoundError:
        pass
    except LockedError as e:
        raise self.retry(exc=e, countdown=5, max_retries=None)

#
# query tasks
#

@app.task(base=StoreTask, bind=True)
def get_work(self, user_uri, work_uri, subgraph=None):
    """
    Get work record from main or public store.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        work_uri -- work identifier
    Keyword arguments:
        subgraph -- Metadata graph to get instead of the full work record.
            Possible subgraphs for works: "metadata" (default: None)
    Returns:
        Work record as dict or an error type:
            ParamError: an invalid graph was requested
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_work(user_uri, work_uri, subgraph)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_work_sources(self, user_uri, work_uri):
    """
    Get work sources from main or public store.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        work_uri -- work identifier
    Returns:
        Source records as list or an error type:
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_work_sources(user_uri, work_uri)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_stock_sources(self, user_uri):
    """
    Get stock sources from main store.

    Arguments:
        user_uri -- user identifier.
    Returns:
        Source records as list.

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store
    try:
        return store.get_stock_sources(user_uri)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_source(self, user_uri, source_uri, subgraph=None):
    """
    Get source record from main store.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        source_uri -- source identifier
    Keyword arguments:
        subgraph -- Metadata graph to get instead of the full work record.
            Possible subgraphs for Sources: "metadata" or "cachedExternalMetadata" (default: None)
    Returns:
        Source record as dict or an error type:
            ParamError: an invalid graph was requested
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_source(user_uri, source_uri, subgraph)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_post(self, user_uri, post_uri, subgraph=None):
    """
    Get post record from main store.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        post_uri -- post identifier
    Keyword arguments:
        subgraph -- Metadata graph to get instead of the full work record.
            Possible subgraphs for Posts: "metadata" or "cachedExternalMetadata" (default: None)
    Returns:
        Post record as dict or an error type:
            ParamError: an invalid graph was requested
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_post(user_uri, post_uri, subgraph)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_posts(self, user_uri, work_uri):
    """
    Get posts for a work from main or public store.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        work_uri -- work identifier
    Returns:
        Post records as list or an error type:
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_posts(user_uri, work_uri)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def get_complete_metadata(self, user_uri, work_uri, format='json'):
    """
    Get complete metadata for a work from main or public store, including
    metadata for all work sources. The metadata will be returned as string
    in the specified format.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        work_uri -- work identifier
    Keyword arguments:
        format -- Results format: 'ntriples', 'rdfxml' or 'json' (Default: 'json')
    Returns:
        Metadata as string in the specified format or an error type:
            ParamError: an unsupported format was requested
            EntryAccessError: the user is not allowed to see the work

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.get_complete_metadata(user_uri, work_uri, format)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def query_works_simple(self, user_uri=None, offset=0, limit=0, query=None):
    """
    Get work records from main or public store using simple key/value matching.

    Arguments:
        user_uri -- user identifier. Use None to query public store (default: None)
        offset -- results offset
        limit -- results limit
        query -- the query in the form of key=value dictionary.
            The keys can either be work properties according to Work schema
            or RDF predicates such as 'http://purl.org/dc/terms/title'.
    Returns:
        List of full work records.

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.main_store if user_uri is not None else self.public_store
    try:
        return store.query_works_simple(user_uri, offset, limit, query)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True)
def query_sparql(self, query_string=None, results_format='json'):
    """
    Query public store using SPARQL.

    Arguments:
        query_string -- SPARQL query
        results_format -- Results format: 'json', 'n3' or 'xml' (Default: 'json')
    Returns:
        Query results in the specified format or an error type:
            ParamError: an unsupported format was requested

        Unhandled non-catalog errors will result in an exception.
    """
    store = self.public_store
    try:
        return store.query_sparql(query_string, results_format)
    except CatalogError as e:
        return error(e)

@app.task(base=StoreTask, bind=True, ignore_result=True, max_retries=None, default_retry_delay=15)
def log_event(self, type, time, user, resource, entry, data):
    """
    Log the catalog event. The task will retry infinitely.

    Arguments:
        type -- event type (str)
        time -- event time in milliseconds (int)
        user -- user who initiated the event
        resource -- URI of primary resource related to the event (usually work)
        entry -- URI of secondary resource (e.g. work source) related to the event
        data -- event data as dict
    Returns:
        None
    """
    try:
        self.log.log_event(type, time, user, resource, entry, data)
    except LogNotAvailable as e:
        raise self.retry(exc=e)

@app.task(base=StoreTask, bind=True)
def query_events(self, type=None, user=None, time_min=None, time_max=None, resource=None, limit=100, offset=0):
    """
    Query the event log using simple key/value matching.

    Arguments:
        type -- event type (default: None)
        user -- user who initiated the event (default: None)
        time_min -- minimum event time in milliseconds (default: None)
        time_min -- maximum event time in milliseconds (default: None)
        resource -- URI of primary resource related to the event (usually work, default: None)
        entry -- URI of secondary resource (e.g. work source) related to the event (default: None)
        limit -- query results limit (default: 100)
        offset -- query results offset (default: 0)
    Returns:
        Event records as list
    """
    return self.log.query_events(type, user, time_min, time_max, resource, limit, offset)


@on_create_work.connect
@on_update_work.connect
@on_delete_work.connect
@on_create_work_source.connect
@on_create_stock_source.connect
@on_update_source.connect
@on_delete_source.connect
@on_create_post.connect
@on_delete_post.connect
def on_work_updated(sender=None, timestamp=None, user_uri=None, work_uri=None, work_data=None,
                    source_uri=None, source_data=None, post_uri=None, post_data=None, **kwargs):
    task = sender
    if sender == create_work:
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_work.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, work_data=work_data)

    elif sender == update_work:
        visibility = work_data.get('visibility')
        # visibility values should be valid here, since this
        # is called after a successful main store update
        if visibility == 'public':
            try:
                task.public_store.get_work(user_uri, work_uri)
                public_update_work.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, work_data=work_data)
            except EntryNotFoundError:
                public_create_work.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, work_data=work_data)
        else:
            try:
                task.public_store.get_work(user_uri, work_uri)
                public_delete_work.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri)
            except EntryNotFoundError:
                pass

    elif sender == delete_work:
        public_delete_work.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri)

    elif sender == create_work_source:
        work_data = task.main_store.get_work(user_uri=user_uri, work_uri=work_uri)
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_work_source.delay(timestamp=timestamp, user_uri=user_uri, work_uri=work_uri, source_uri=source_uri, source_data=source_data)

    elif sender == create_stock_source:
        #public_create_stock_source.delay(user_uri=user_uri, source_uri=source_uri, source_data=source_data)
        pass

    elif sender == update_source:
        if work_uri:
            work_data = task.main_store.get_work(user_uri=user_uri, work_uri=work_uri)
            if visibility == 'public':
                public_update_source.delay(timestamp=timestamp, user_uri=user_uri, source_uri=source_uri, source_data=source_data)

    elif sender == delete_source:
        public_delete_source.delay(timestamp=timestamp, user_uri=user_uri, source_uri=source_uri)

    elif sender == create_post:
        work_data = task.main_store.get_work(user_uri=user_uri, work_uri=work_uri)
        visibility = work_data.get('visibility')
        if visibility == 'public':
            public_create_post.delay(timestamp=timestamp, user_uri=user_uri, post_uri=post_uri, post_data=post_data)

    elif sender == delete_post:
        public_delete_post.delay(timestamp=timestamp, user_uri=user_uri, post_uri=post_uri)
