#!/bin/sh
set -e

echo "⏳  Ejecutando migraciones Prisma..."
npx prisma migrate deploy
echo "✅  Migraciones aplicadas."

exec "$@"
