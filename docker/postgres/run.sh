#!/bin/sh

set -e
set -u

chmod 755 /data

# Since these may come from an external volume,
# make sure data and log directories exist
mkdir -p /data/postgres/db /data/postgres/log
chown -R postgres.postgres /data/postgres

if [ ! -f /data/postgres/db/PG_VERSION ]; then
    /bin/su postgres -c "/usr/lib/postgresql/9.3/bin/initdb -E UTF-8 /data/postgres/db"

    # start as daemon so we're able to create user and database here
    service postgresql start && \
        /bin/su postgres -c "psql --command \"CREATE USER docker WITH SUPERUSER PASSWORD 'docker';\"" && \
        /bin/su postgres -c 'createdb catalog_public' && \
        /bin/su postgres -c 'createdb catalog_works' && \
        service postgresql stop || exit 1
fi

# actually run postgres as non-daemon
/bin/su postgres -c "/usr/lib/postgresql/9.3/bin/postgres -c config_file=/etc/postgresql/9.3/main/postgresql.conf"
