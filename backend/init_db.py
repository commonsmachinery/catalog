#!/usr/bin/env python

import RDF, os, sys, re

from catalog.config import config
from catalog.store import MainStore

for name in ['public', 'works']:
    storage_type, options = MainStore.get_store_options(name)

    # workaround: sqlite doesn't support 'dir' so prepend directory to the name
    if storage_type == 'sqlite':
        name = os.path.abspath(os.path.join(config.CATALOG_DATA_DIR, name))

    sys.stdout.write('Creating {type} store: {name}\nUsing: {options}\n'.format(
            type=storage_type,
            name=name,
            options=re.sub("password='[^']+'", "password='***'", options)))

    options = options + "new='true'"

    store = RDF.Storage(storage_name=storage_type, name=name, options_string=options)
    model = RDF.Model(store)
    model.sync()
