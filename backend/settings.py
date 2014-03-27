import os

# Infrastructure paths and URLS
BROKER_URL = os.getenv('CATALOG_BROKER_URL', 'amqp://guest@localhost:5672//')
MONGODB_URL = os.getenv('CATALOG_MONGODB_URL', 'mongodb://localhost:27017/')

# Used for sqlite and Redland local storage, typically only used in devevelopment
DATA_DIR = os.getenv('CATALOG_DATA_DIR', './data')

# Event log type: sqlite or mongodb
EVENT_LOG_TYPE = os.getenv('CATALOG_EVENT_LOG_TYPE', 'sqlite')

# Name of event log DB (when using MongoDB)
EVENT_LOG_DB = 'events'

# backend store type: hashes, postgres or memory
BACKEND_STORE_TYPE = 'hashes'

# hash store options
BACKEND_STORE_HASH_TYPE = os.getenv('CATALOG_BACKEND_STORE_HASH_TYPE', 'bdb')
BACKEND_STORE_DIR = os.getenv('CATALOG_BACKEND_STORE_DIR', '.')