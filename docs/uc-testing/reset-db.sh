#!/usr/bin/env bash
# Restores the LOCAL test database to the clean seed dump. Owner-approved (D3). Never point this at a shared database.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BE="$HERE/../../../sa-lathe-shop-be"
DUMP="${1:-$HERE/backup/sa_lathe_shop_demo_clean-seed.dump}"
PG=sa-lathe-shop-be-postgres-1
DB=sa_lathe_shop_demo
[ -f "$DUMP" ] || { echo "dump not found: $DUMP"; exit 1; }
DUMP="$(cd "$(dirname "$DUMP")" && pwd)/$(basename "$DUMP")"
[ "$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$PG")" = "sa-lathe-shop-be" ] || { echo "unexpected container"; exit 1; }
cd "$BE"
docker compose --profile app stop api worker
docker exec "$PG" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS '"$DB"' WITH (FORCE);" -c "CREATE DATABASE '"$DB"';"'
docker exec -i "$PG" sh -c 'pg_restore --no-owner --exit-on-error -U "$POSTGRES_USER" -d '"$DB" < "$DUMP"
docker compose --profile app start api worker
for _ in $(seq 1 30); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health/ready)" = "200" ]; then break; fi
  sleep 2
done
curl -s http://localhost:8080/health/ready; echo
[ -n "${1:-}" ] || rm -f "$HERE/tmp/state.json" "$HERE/tmp/logins.json" "$HERE/tmp/console.log"
docker exec "$PG" sh -c 'psql -At -U "$POSTGRES_USER" -d '"$DB"' -c "select version from schema_migrations"' 2>&1 | tail -5
