# Build image: docker build -t commonsmachinery/redis .
#
# Based on: https://github.com/dockerfile/redis

FROM commonsmachinery/ubuntu

# Install Redis.
RUN apt-get install -y software-properties-common
RUN add-apt-repository -y ppa:chris-lea/redis-server
RUN apt-get update
RUN apt-get install -y redis-server

ADD redis.conf /etc/redis/redis.conf
ADD run.sh /run.sh
RUN chmod 755 /run.sh

# Expose ports.
EXPOSE 6379

WORKDIR /tmp
ENTRYPOINT ["/run.sh"]
