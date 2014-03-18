#! /usr/bin/env python

import subprocess, time, sys

celery = subprocess.Popen(["celery", "-A", "catalog_backend", "worker", "--loglevel=info", "--autoreload"])
#redis = subprocess.Popen(["redis-server", "redis_local.conf"])
frontend = subprocess.Popen(["node", "node_modules/nodemon/bin/nodemon.js", "server.js"], cwd="frontend")
mongodb = subprocess.Popen(["mongod", "--dbpath", "data/db"])

while True:
    try:
        time.sleep(1)
    except KeyboardInterrupt:
        break

celery.terminate()
#redis.terminate()
frontend.terminate()
mongodb.terminate()