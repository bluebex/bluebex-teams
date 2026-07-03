#!/bin/bash
set -e

APP_DIR="/opt/bluebex-teams"
cd "$APP_DIR"

echo "=== Pulling latest code ==="
git pull origin main

echo "=== Installing dependencies ==="
npm ci --omit=dev

echo "=== Generating Prisma client ==="
npx prisma generate --schema packages/db/prisma/schema.prisma

echo "=== Running database migrations ==="
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma

echo "=== Building API ==="
cd apps/api
npx tsc
cd "$APP_DIR"

echo "=== Building Web ==="
cd apps/web
npx next build
cd "$APP_DIR"

echo "=== Restarting services ==="
sudo systemctl restart bluebex-api
sudo systemctl restart bluebex-web

echo "=== Deploy complete ==="
