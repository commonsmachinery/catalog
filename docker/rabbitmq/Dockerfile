# Build image: docker build -t commonsmachinery/rabbitmq .
#
# It's assumed that /data is available as a data volume to store:
#   Database: /data/rabbitmq/db
#   Logs:     /data/rabbitmq/log


FROM commonsmachinery/ubuntu

# Grab the latest rabbitmq - it's noarch, so we don't have to worry about the exact dist
RUN echo "deb http://www.rabbitmq.com/debian/ testing main" >> /etc/apt/sources.list
RUN apt-get install -y wget
RUN wget http://www.rabbitmq.com/rabbitmq-signing-key-public.asc -O /tmp/rabbitmq-signing-key-public.asc
RUN apt-key add /tmp/rabbitmq-signing-key-public.asc
RUN apt-get -y update

RUN apt-get install -y rabbitmq-server

ADD run.sh /run.sh
ADD rabbitmq-env.conf /etc/rabbitmq/rabbitmq-env.conf
ADD rabbitmq.config /etc/rabbitmq/rabbitmq.config

RUN chmod 755 /run.sh

RUN /usr/sbin/rabbitmq-plugins enable rabbitmq_management

EXPOSE 5672 15672

WORKDIR /var/lib/rabbitmq
ENTRYPOINT ["/run.sh"]
