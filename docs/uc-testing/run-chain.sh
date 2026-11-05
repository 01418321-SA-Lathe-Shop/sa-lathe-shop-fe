#!/usr/bin/env bash
# Runs UC specs in order and keeps a database + state checkpoint after each, so one UC can be rerun without replaying the chain.
# Usage: run-chain.sh <from> <to>   (restores the checkpoint of <from>-1 first; from=1 restores the clean seed)
set -uo pipefail
cd "$(dirname "$0")"
PG=sa-lathe-shop-be-postgres-1; DB=sa_lathe_shop_demo
mkdir -p tmp/cp
from=$1; to=$2
if [ "$from" -le 1 ]; then bash reset-db.sh >/dev/null 2>&1
else p=$(printf %02d $((from-1))); bash reset-db.sh "tmp/cp/uc$p.dump" >/dev/null 2>&1; cp "tmp/cp/uc$p.state.json" tmp/state.json; fi
for n in $(seq "$from" "$to"); do
  u=$(printf %02d "$n")
  npx playwright test "tests/uc$u.spec.ts" --reporter=line 2>&1 | grep -E "^\[(PASS|FAIL|SKIP)\]|passed|failed|Error:" | cut -c1-800 > "tmp/run-uc$u.log"
  docker exec "$PG" sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d '"$DB" > "tmp/cp/uc$u.dump"
  cp tmp/state.json "tmp/cp/uc$u.state.json"
  echo "== uc$u PASS=$(grep -c '^\[PASS\]' "tmp/run-uc$u.log") $(grep -vE '^\[PASS\]' "tmp/run-uc$u.log" | cut -c1-500)"
done
