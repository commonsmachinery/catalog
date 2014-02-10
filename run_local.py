#! /usr/bin/env python

import subprocess, time, sys

celery = subprocess.Popen(["celery", "-A", "catalog_backend", "worker", "--loglevel=info", "--workdir=data"])
redis = subprocess.Popen(["redis-server", "redis_local.conf"])

while True:
    try:
        time.sleep(1)
    except KeyboardInterrupt:
        break

celery.terminate()
redis.terminate()