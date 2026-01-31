#!/bin/bash
# PostgreSQL initialization script
# This script runs on container startup via docker-entrypoint-initdb.d

set -e

# Copy pg_hba.conf to the data directory if it exists
if [ -f /etc/postgresql/pg_hba.conf ]; then
    echo "Copying custom pg_hba.conf..."
    cp /etc/postgresql/pg_hba.conf "$PGDATA/pg_hba.conf"
    chown postgres:postgres "$PGDATA/pg_hba.conf"
    chmod 600 "$PGDATA/pg_hba.conf"
fi

# Create skyvern database and user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create skyvern database if it doesn't exist
    SELECT 'CREATE DATABASE skyvern'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'skyvern')\gexec
    
    -- Create skyvern user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'skyvern') THEN
            CREATE USER skyvern WITH PASSWORD 'skyvern_secure_2026';
        END IF;
    END \$\$;
    
    -- Grant privileges on skyvern database
    GRANT ALL PRIVILEGES ON DATABASE skyvern TO skyvern;
EOSQL

# Connect to skyvern database and setup schema privileges
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "skyvern" <<-EOSQL
    GRANT ALL ON SCHEMA public TO skyvern;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO skyvern;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO skyvern;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO skyvern;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO skyvern;
EOSQL

echo "PostgreSQL initialization completed!"
