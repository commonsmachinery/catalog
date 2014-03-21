#! /usr/bin/env python

import subprocess, time, sys, os

celery = subprocess.Popen(["celery", "-A", "catalog", "worker", "--loglevel=info", "--autoreload"], cwd="backend")
#redis = subprocess.Popen(["redis-server", "redis_local.conf"])
frontend = subprocess.Popen(["node", "node_modules/nodemon/bin/nodemon.js", "server.js"], cwd="frontend")
mongodb = subprocess.Popen(["mongod", "--smallfiles", "--dbpath",
                            os.path.join(os.getenv("CATALOG_DATA_DIR", "data"), "db")])

while True:
    try:
        time.sleep(1)
    except KeyboardInterrupt:
        break

celery.terminate()
#redis.terminate()
frontend.terminate()
mongodb.terminate()
