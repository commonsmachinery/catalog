#! /usr/bin/env python

import subprocess, time, sys

celery = subprocess.Popen(["celery", "-A", "catalog_backend", "worker", "--loglevel=info", "--workdir=data", "--autoreload"])
#redis = subprocess.Popen(["redis-server", "redis_local.conf"])
frontend = subprocess.Popen(["node", "node_modules/nodemon/bin/nodemon.js", "frontend/server.js"],)


while True:
    try:
        time.sleep(1)
    except KeyboardInterrupt:
        break

celery.terminate()
#redis.terminate()
frontend.terminate()
