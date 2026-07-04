#!/bin/sh
set -e

echo "Syncing database schema..."
prisma db push --skip-generate --schema=./prisma/schema.prisma

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Seeding demo data..."
  node prisma/seed.cjs
fi

echo "Starting server..."
exec node server.js
