# Build image: docker build -t commonsmachinery/backend .

FROM commonsmachinery/backend-base

RUN mkdir -p /tmp/backend /backend

# Needed for install
ADD setup.py /tmp/backend/setup.py
ADD catalog /tmp/backend/catalog

# Install and cleanup
RUN (cd /tmp/backend; python setup.py install)
RUN rm -rf /tmp/backend

# Files for running
ADD docker_run.sh /backend/docker_run.sh
ADD settings.py /backend/settings.py
ADD logging.ini /backend/logging.ini

ENTRYPOINT ["/backend/docker_run.sh"]
