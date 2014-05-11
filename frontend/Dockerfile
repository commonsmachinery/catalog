# Build image: docker build -t commonsmachinery/frontend .

FROM commonsmachinery/ubuntu

# We need build support to build some native modules
RUN apt-get update
RUN apt-get install -y build-essential python2.7 nodejs npm

# Get symlink from node
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Just grab everything, which means we might get an already populated node_modules
ADD . /frontend/

# Rebuild to ensure that any binary modules match this system
ENV PYTHON /usr/bin/python2.7

RUN cd /frontend; npm rebuild

# Then install any missing dependencies
RUN cd /frontend; npm install; ./volo_add.sh

# Build what needs to be built
RUN cd /frontend; make style

CMD []
ENTRYPOINT ["/frontend/docker_run.sh"]
