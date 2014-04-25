# Build image: docker build -t commonsmachinery/postgres .
#
# It's assumed that /data is available as a data volume to store:
#   Database: /data/postgres/db
#   Logs:     /data/postgres/log


FROM ubuntu

RUN apt-get -y update
RUN apt-get install -y postgresql-9.3

ADD run.sh /run.sh
RUN chmod 755 /run.sh

EXPOSE 5432

RUN echo "data_directory = '/data/postgres/db'" >> /etc/postgresql/9.3/main/postgresql.conf
RUN echo "logging_collector = on" >> /etc/postgresql/9.3/main/postgresql.conf
RUN echo "log_directory = '/data/postgres/log'" >> /etc/postgresql/9.3/main/postgresql.conf
RUN echo "listen_addresses = '*'" >> /etc/postgresql/9.3/main/postgresql.conf

RUN echo "host all all 0.0.0.0/0 md5" >> /etc/postgresql/9.3/main/pg_hba.conf

WORKDIR /tmp
ENTRYPOINT ["/run.sh"]
