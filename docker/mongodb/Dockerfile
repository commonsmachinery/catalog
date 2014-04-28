# Build image: docker build -t commonsmachinery/mongodb .
#
# Based on: https://github.com/dockerfile/mongodb

FROM dockerfile/ubuntu

# Install MongoDB.
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
RUN echo 'deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen' | tee /etc/apt/sources.list.d/mongodb.list
RUN apt-get update
RUN apt-get install -y mongodb-10gen

ADD mongodb.conf /etc/mongodb.conf
ADD run.sh /run.sh
RUN chmod 755 /run.sh

# Expose ports.
#   - 27017: process
#   - 28017: http
EXPOSE 27017
EXPOSE 28017

WORKDIR /tmp
ENTRYPOINT ["/run.sh"]
