#!/bin/bash
# Custom entrypoint for Skyvern that completely bypasses alembic migrations
# Since we've already run migrations manually, we just start the server directly

set -e

echo "Starting Skyvern with pre-migrated database..."
echo "Database URL: ${DATABASE_URL}"

# Test database connection
echo "Testing database connection..."
python3 -c "
import psycopg
import asyncio

async def test():
    try:
        conn = await psycopg.AsyncConnection.connect('${DATABASE_URL}')
        await conn.close()
        print('✓ Database connection successful')
    except Exception as e:
        print(f'✗ Database connection failed: {e}')
        exit(1)

asyncio.run(test())
"

echo "Database is ready, starting Skyvern server..."

_kill_xvfb_on_term() {
  kill -TERM $xvfb
}

# Setup a trap to catch SIGTERM and relay it to child processes
trap _kill_xvfb_on_term TERM

echo "Starting Xvfb..."
# delete the lock file if any
rm -f /tmp/.X99-lock
# Set display environment variable
export DISPLAY=:99
# Start Xvfb
Xvfb :99 -screen 0 1920x1080x16 &
xvfb=$!

DISPLAY=:99 xterm 2>/dev/null &
python run_streaming.py > /dev/null &

# Run the Skyvern forge application directly (bypassing migrations)
echo "Starting Skyvern forge..."
exec python -m skyvern.forge
