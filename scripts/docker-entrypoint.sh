#!/bin/sh
set -e

echo "[entrypoint] Starting CashPulse container..."

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] Running database migrations..."
  node ./scripts/migrate.js || {
    echo "[entrypoint] Database migration encountered an error, continuing startup..."
  }
fi

echo "[entrypoint] Launching Next.js server on port ${PORT:-3000}..."
exec node server.js
