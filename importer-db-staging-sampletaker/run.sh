#!/bin/bash

read -rp "Are you running this locally or in pannu(l/p)?" RUNENV
pannupath="/home/importer_user/staging/backup/importer-db-staging.sqz"
if [ "$RUNENV" = "l" ]; then
  # Get db from pannu to current folder
  echo "Enter your Uni Helsinki username:"
  read -r username
  echo "Using your Uni Helsinki username: $username"

  scp -r -o ProxyCommand="ssh -l $username -W %h:%p melkki.cs.helsinki.fi" \
  "$username@importer:$pannupath" importer-db-staging.sqz
elif [ "$RUNENV" = "p" ]; then
  cp pannupath .
fi

# Setup db inside docker
retry () {
    for i in {1..60}; do
        "$@" && break || echo "Retry attempt $i failed, waiting..." && sleep 10;
    done
}
drop_psql () {
    echo "Dropping psql in container $1 with db name $2"
    retry docker exec -u postgres "$1" pg_isready --dbname="$2"
    docker exec -u postgres "$1" dropdb "$2" || echo "container $1 DB $2 does not exist"
}
ping_psql () {
    drop_psql "$1" "$2"
    echo "Creating psql in container $1 with db name $2"
    retry docker exec -u postgres "$1" pg_isready --dbname="$2"
    docker exec -u postgres "$1" createdb "$2" || echo "container $1 DB $2 already exists"
}
restore_psql_from_backup () {
    echo ""
    echo "Restoring database from backup ($1/$2):"
    echo "  1. Copying dump..."
    docker cp "$1" "$2:/asd.sqz"
    echo "  2. Writing database..."
    docker exec "$2" pg_restore -U postgres --no-owner -F c --dbname="$3" -j4 /asd.sqz
}

docker-compose up -d importer-db-staging
ping_psql importer-db-staging importer-db-staging
restore_psql_from_backup importer-db-staging.sqz importer-db-staging importer-db-staging

# Create copy of original table with correct name for oodikone
docker exec importer-db-staging psql -U postgres -c 'DROP DATABASE IF EXISTS "sis-importer-db";'
docker exec importer-db-staging psql -U postgres -c 'CREATE DATABASE "sis-importer-db" WITH TEMPLATE "importer-db";'

# Run sampletaker: first dry-run, then confirm
docker-compose up importer-db-staging-sampletaker dry-run

read -rp "Create sample by nuking extra stuff from db(y/n)?" CONT
if [ "$CONT" != "y" ]; then
  exit 0
fi

docker-compose up importer-db-staging-sampletaker destroy

# Vacuum the sample database
docker exec importer-db-staging psql -U postgres sis-importer-db -c 'VACUUM FULL;'

# Finally create dump that contains only the new sample
docker exec -i importer-db-staging pg_dump -Fc -U postgres sis-importer-db > sis-importer-db.sqz

# Remove original dump
rm importer-db-staging.sqz

# Run down services
docker-compose down --rmi all --volumes --remove-orphans
