#!/bin/sh
set -e

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "Refusing to seed publicly known demo credentials in production." >&2
  exit 1
fi

echo "Applying database migrations..."
node node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma

echo "Starting server..."
exec node server.js
