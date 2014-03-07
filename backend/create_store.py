#!/usr/bin/env python

import sys
import RDF
from catalog.store import RedlandStore

STORES = ('works', 'public')

def main():
    for name in STORES:
        storage_type, options = RedlandStore.get_store_config(name)
        if storage_type in ('postgresql', 'mysql'):
            create_store(storage_type, options, name)

def create_store(storage_type, options, name):
    # See if we can connect and access the model tables
    try:
        store = RDF.Storage(
            storage_name = storage_type,
            name = name,
            options_string = options + ",write='false'")
        return
    except RDF.RedlandError, e:
        sys.stderr.write('Error accessing {name}. Message: {error}\n'.format(
                name = name, error = e))

    sys.stderr.write('Attempting to create store {name}\n'.format(name = name))

    # Create a new store, but this time with the option new
    try:
        store = RDF.Storage(
            storage_name = storage_type,
            name = name,
            options_string = options + ",new='true'")
    except RDF.RedlandError, e:
        sys.stderr.write('Could not create the store {name}. Message: {error}\n'.format(
                name = name, error = e))
        sys.exit(1)

    sys.stderr.write('Successfully created store {name}\n'.format(name = name))


if __name__ == '__main__':
    main()

