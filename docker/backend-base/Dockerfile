# Docker image name: commonsmachinery/backend-base

# This provides all the dependencies for building the actual backend
# image, avoiding to get and build all dependencies each time that
# image is built.

FROM dockerfile/ubuntu

# dockerfile/ubuntu has already added the apt repository and updated itself

RUN apt-get update
RUN apt-get install -y \
    git \
    build-essential \
    autoconf \
    automake \
    libtool \
    python-dev \
    python-pip \
    swig \
    redland-utils \
    librdf0-dev \
    librdf-storage-postgresql \
    librdf-storage-sqlite

# We must build the Redland python bindings ourselves since we've patched them

RUN cd /tmp && \
    git clone --depth 1 https://github.com/commonsmachinery/redland-bindings.git && \
    cd redland-bindings && \
    ./autogen.sh --with-python=/usr/bin/python2.7 && \
    cd python && \
    make install && \
    cd /tmp && \
    rm -rf /tmp/redland-bindings

