# Build image: docker.io build -t commonsmachinery/catalog .

FROM commonsmachinery/ubuntu

# We need build support to build some native modules
RUN apt-get update
RUN apt-get install --no-install-recommends -y build-essential nodejs npm
RUN apt-get install --no-install-recommends -y libzmq3-dev

# Get symlink from node
RUN ln -s /usr/bin/nodejs /usr/bin/node

# Copy in all of the catalog
ADD . /catalog

# Get a clean code base
RUN cd /catalog; git clean -fxd

# Install all dependencies
RUN cd /catalog; ./setup_devenv.sh

# Build what needs to be built
RUN cd /catalog; make 

USER nobody
CMD []
ENTRYPOINT ["/catalog/docker/run.sh"]
